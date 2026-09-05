import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/whatsapp/encryption";
import { refreshAccessToken, getFreeBusy } from "@/lib/google-calendar/client";
import { chunkIntoSlots, subtractRanges, type TimeRange } from "./availability";
import { computeClinicRanges, getBusinessHoursStatus } from "./business-hours";
import { resolveFeatureAccess, type FeatureOverrides } from "@/lib/billing-platform/features";
import type { Plan } from "@/lib/billing-platform/plans";
import { loadPublicDepositInfo, type PublicDepositInfo } from "@/lib/payments/config";
import { hasIntakeFormContent, type IntakeFormConfig } from "@/lib/intake-forms/types";

/**
 * Server-only slot computation for the public booking widget
 * (/agendar/[slug]). Always called with the service-role client —
 * there's no end-user session for an anonymous visitor.
 *
 * Bookable time = the doctor's declared availability blocks, minus
 * existing appointments, minus Google Calendar busy time (if
 * connected) — the exact same sources the internal Agenda view
 * already treats as authoritative, just recombined for public
 * consumption. A doctor with no declared blocks simply has no public
 * slots; that's an existing, documented property of
 * `doctor_availability_blocks`, not a new gap introduced here.
 */
export async function computeAvailableSlots(
  admin: SupabaseClient,
  params: {
    accountId: string;
    doctorId: string;
    slotMinutes: number;
    rangeStart: string; // ISO
    rangeEnd: string; // ISO
    /** Consultorio elegido — cuando se pasa junto con `useClinicHours`, los
     *  slots se acotan al horario de ese consultorio (feature premium). */
    roomId?: string | null;
    /** Solo cuentas Profesional+ aplican el horario de clínica; Esencial
     *  conserva el comportamiento previo (solo bloques del médico). */
    useClinicHours?: boolean;
  },
): Promise<TimeRange[]> {
  const { accountId, doctorId, slotMinutes, rangeStart, rangeEnd, roomId, useClinicHours } = params;

  const [blocksRes, apptsRes, doctorRes] = await Promise.all([
    admin
      .from("doctor_availability_blocks")
      .select("start_at, end_at")
      .eq("account_id", accountId)
      .eq("doctor_id", doctorId)
      .lt("start_at", rangeEnd)
      .gt("end_at", rangeStart),
    admin
      .from("appointments")
      .select("start_at, end_at")
      .eq("account_id", accountId)
      .eq("doctor_id", doctorId)
      .neq("status", "cancelled")
      .lt("start_at", rangeEnd)
      .gt("end_at", rangeStart),
    admin.from("doctors").select("user_id").eq("id", doctorId).maybeSingle(),
  ]);

  const declaredBlocks = (blocksRes.data ?? []) as TimeRange[];
  const busy: TimeRange[] = [...((apptsRes.data ?? []) as TimeRange[])];

  // Best-effort Google Calendar overlay — same fail-open posture as
  // /api/google-calendar/busy-range: a missing connection or an
  // expired/unrefreshable token just means we skip this signal
  // rather than failing the whole public page.
  const doctorUserId = doctorRes.data?.user_id as string | undefined;
  if (doctorUserId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("google_calendar_id, google_refresh_token")
      .eq("account_id", accountId)
      .eq("user_id", doctorUserId)
      .eq("google_calendar_connected", true)
      .not("google_refresh_token", "is", null)
      .maybeSingle();

    if (profile?.google_refresh_token) {
      try {
        const accessToken = await refreshAccessToken(decrypt(profile.google_refresh_token));
        const calendarId = profile.google_calendar_id || "primary";
        const periods = await getFreeBusy(accessToken, calendarId, rangeStart, rangeEnd);
        busy.push(...periods.map((p) => ({ start_at: p.start, end_at: p.end })));
      } catch (err) {
        console.error(`[public-booking] Google freeBusy failed for doctor ${doctorId}:`, err);
      }
    }
  }

  // Horario de clínica por consultorio (premium): si está habilitado y el
  // consultorio tiene horario, se usa como base — si el médico declaró
  // bloques ese día se intersectan con el horario; si no, el horario de
  // clínica ES la base. Sin habilitar / sin horario → bloques del médico
  // como siempre (Esencial no cambia).
  let base: TimeRange[] = declaredBlocks;
  if (useClinicHours && roomId) {
    const { ranges: clinicRanges, configured } = await computeClinicRanges(
      admin,
      accountId,
      rangeStart,
      rangeEnd,
      roomId,
    );
    if (configured) {
      base =
        declaredBlocks.length > 0
          ? // declaredBlocks ∩ clinicRanges  ==  A − (A − B)
            subtractRanges(declaredBlocks, subtractRanges(declaredBlocks, clinicRanges))
          : clinicRanges;
    }
  }

  const free = subtractRanges(base, busy);
  const slots = chunkIntoSlots(free, slotMinutes);

  // Drop anything that's already started — a visitor browsing "today"
  // shouldn't be offered a slot 20 minutes in the past.
  const now = new Date();
  return slots.filter((s) => new Date(s.start_at) > now);
}

/** Un bloque reordenable/activable de la página de reserva pública. */
export type BookingBlockId = "whatsapp" | "booking" | "services" | "social" | "location";

export interface BookingBlockConfig {
  id: BookingBlockId;
  enabled: boolean;
}

/** Orden y estado por defecto — usado tanto para cuentas nuevas como para
 *  cuentas que guardaron su página antes de que `blocks` existiera. */
export const DEFAULT_BOOKING_BLOCKS: BookingBlockConfig[] = [
  { id: "whatsapp", enabled: true },
  { id: "booking", enabled: true },
  { id: "services", enabled: true },
  { id: "social", enabled: true },
  { id: "location", enabled: true },
];

/**
 * Resuelve el orden/activación de bloques a mostrar. Si la cuenta ya
 * guardó `blocks` explícitamente, se usa tal cual (permite reordenar y
 * ocultar). Si no (cuentas creadas antes de esta feature), se deriva de
 * los dos flags legacy `showServices`/`showAddress` para no cambiarle
 * la página a nadie en silencio.
 */
export function resolveBookingBlocks(page: BookingPageConfig): BookingBlockConfig[] {
  if (page.blocks && page.blocks.length > 0) return page.blocks;
  return DEFAULT_BOOKING_BLOCKS.map((b) => ({
    ...b,
    enabled:
      b.id === "services" ? page.showServices !== false : b.id === "location" ? page.showAddress !== false : true,
  }));
}

/** Personalización "link-in-bio" de la página pública (accounts.booking_page). */
export interface BookingPageConfig {
  accentColor?: string | null;
  coverImageUrl?: string | null;
  coverColor?: string | null;
  logoUrl?: string | null;
  headline?: string | null;
  tagline?: string | null;
  bio?: string | null;
  contact?: {
    whatsapp?: string | null;
    phone?: string | null;
    email?: string | null;
    mapUrl?: string | null;
  } | null;
  social?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    web?: string | null;
  } | null;
  /** Orden y visibilidad de los bloques de la página — ver {@link resolveBookingBlocks}. */
  blocks?: BookingBlockConfig[];
  /** @deprecated usa `blocks` (id "services") — se conserva solo para
   *  resolver el estado por defecto de cuentas guardadas antes de esa
   *  feature; el editor ya no lo escribe. */
  showServices?: boolean;
  showDoctors?: boolean;
  /** @deprecated usa `blocks` (id "location") — ídem `showServices`. */
  showAddress?: boolean;
}

export interface PublicBookingConfig {
  accountId: string;
  accountName: string;
  accountLogoUrl: string | null;
  address: string | null;
  page: BookingPageConfig;
  /** `hasIntakeForm` is always false when the account lacks the
   *  intake_forms feature — the widget never even learns a form
   *  exists for a downgraded account, matching the fail-open pattern
   *  used for clinicHoursEnabled/bookingPageEnabled below. The actual
   *  form questions are fetched lazily (lookup-patient route), not
   *  shipped here — no reason to send every visitor every doctor's
   *  full questionnaire before they've even picked one. */
  doctors: { id: string; name: string; specialty: string | null; hasIntakeForm: boolean }[];
  serviceTypes: { id: string; name: string; duration_minutes: number; price: number | null }[];
  /** Consultorios activos (ubicaciones). El widget muestra un selector de
   *  ubicación solo cuando `clinicHoursEnabled` y hay al menos uno. */
  rooms: { id: string; name: string; address: string | null }[];
  /** ¿La cuenta tiene la feature premium de horarios por consultorio? */
  clinicHoursEnabled: boolean;
  /** ¿La cuenta tiene la feature premium de personalización link-in-bio? */
  bookingPageEnabled: boolean;
  /** Anticipo requerido para reservar (premium) — null cuando no está
   *  activo/configurado o la cuenta no tiene la feature. Nunca incluye
   *  credenciales del proveedor, solo lo que el visitante necesita ver. */
  deposit: PublicDepositInfo | null;
  /** "Abierto ahora · cierra a las…" — `configured: false` cuando la
   *  cuenta no declaró horario de negocio, para no fabricar un estado. */
  businessHours: { configured: boolean; open: boolean; closesAtLabel: string | null };
}

/**
 * Shared lookup behind both the SSR page (/agendar/[slug]) and the
 * config API route — resolves a published slug into the clinic name
 * plus its active doctors/service types, or null if the slug is
 * unclaimed or the account has paused its page.
 */
export async function getPublicBookingConfig(
  admin: SupabaseClient,
  slug: string,
): Promise<PublicBookingConfig | null> {
  const { data: account } = await admin
    .from("accounts")
    .select("id, name, public_booking_enabled, plan, feature_overrides, logo_url, address, booking_page")
    .eq("public_booking_slug", slug)
    .maybeSingle();

  if (!account || !account.public_booking_enabled) return null;

  const [{ data: doctors }, { data: serviceTypes }, { data: rooms }] = await Promise.all([
    admin
      .from("doctors")
      .select("id, name, specialty, intake_form_config")
      .eq("account_id", account.id)
      .eq("is_active", true)
      .order("name"),
    admin
      .from("service_types")
      .select("id, name, duration_minutes, price")
      .eq("account_id", account.id)
      .eq("is_active", true)
      .order("name"),
    admin
      .from("rooms")
      .select("id, name, address")
      .eq("account_id", account.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const overrides = account.feature_overrides as FeatureOverrides | null;
  const clinicHoursEnabled = resolveFeatureAccess(account.plan as Plan, "clinic_hours", overrides);
  const bookingPageEnabled = resolveFeatureAccess(account.plan as Plan, "booking_page", overrides);
  const paymentGatewayEnabled = resolveFeatureAccess(account.plan as Plan, "payment_gateway", overrides);
  const deposit = paymentGatewayEnabled ? await loadPublicDepositInfo(admin, account.id) : null;
  const intakeFormsEnabled = resolveFeatureAccess(account.plan as Plan, "intake_forms", overrides);
  const businessHours = await getBusinessHoursStatus(admin, account.id);

  return {
    accountId: account.id,
    accountName: account.name,
    accountLogoUrl: account.logo_url ?? null,
    address: account.address ?? null,
    // La personalización solo se aplica si la cuenta tiene la feature premium;
    // si no, la página usa los valores por defecto (nombre + acento de marca).
    page: bookingPageEnabled ? ((account.booking_page as BookingPageConfig | null) ?? {}) : {},
    doctors: (doctors ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      hasIntakeForm: intakeFormsEnabled && hasIntakeFormContent(d.intake_form_config as IntakeFormConfig | null),
    })),
    serviceTypes: serviceTypes ?? [],
    rooms: rooms ?? [],
    clinicHoursEnabled,
    bookingPageEnabled,
    deposit,
    businessHours,
  };
}
