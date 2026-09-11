/**
 * In-app feature gates that vary by plan (as opposed to
 * `hasActiveAccess` in plans.ts, which is the binary "is this account
 * locked out entirely" check).
 *
 * Deliberately narrow: only features with an actual in-app screen are
 * listed here. Most other agency-delivered line items from the
 * /pricing checklist (Meta/Google Ads management, monthly content,
 * account manager, strategy sessions) have no in-app surface to gate
 * — those are fulfilled outside this codebase. "Landing de
 * especialidad" is the one exception with two delivery modes: a
 * self-serve basic builder gated here (`landing_builder`), and a
 * premium version built by Zentro's internal design team from the
 * platform-admin editor (staff-only, gated by requirePlatformAdmin()
 * rather than a plan check — see puck-config.tsx).
 */

import type { Plan } from "./plans";

export type GatedFeature =
  | "automations"
  | "ai_autoreply"
  | "ai_draft"
  | "whatsapp_inbox"
  | "broadcasts"
  | "landing_builder"
  | "conversation_reminders"
  | "clinic_hours"
  | "booking_page"
  | "ai_copilot"
  | "payment_gateway"
  | "intake_forms";

export const GATED_FEATURES: GatedFeature[] = [
  "automations",
  "ai_autoreply",
  "ai_draft",
  "whatsapp_inbox",
  "broadcasts",
  "landing_builder",
  "conversation_reminders",
  "clinic_hours",
  "booking_page",
  "ai_copilot",
  "payment_gateway",
  "intake_forms",
];

export const FEATURE_LABEL: Record<GatedFeature, string> = {
  automations: "Automatizaciones y Flows",
  ai_autoreply: "WhatsApp IA",
  ai_draft: "Sugerencia de respuesta con IA (bandeja de WhatsApp)",
  whatsapp_inbox: "Bandeja de WhatsApp",
  broadcasts: "Difusiones",
  landing_builder: "Constructor de landing",
  conversation_reminders: "Recordatorios de conversación",
  clinic_hours: "Horarios por consultorio",
  booking_page: "Página de reserva personalizada",
  ai_copilot: "Copiloto de IA",
  payment_gateway: "Pasarela de pago (anticipo)",
  intake_forms: "Formulario de admisión de pacientes",
};

/** `accounts.feature_overrides` — absent key falls back to the plan default. */
export type FeatureOverrides = Partial<Record<GatedFeature, boolean>>;

const FEATURE_MIN_PLAN: Record<GatedFeature, Plan[]> = {
  // Landing page's Esencial card explicitly X's out "Automatizaciones
  // y campañas de difusión" — customizable automations only start at
  // Profesional ("Automatizaciones personalizables" is a Profesional
  // pf-new line item).
  automations: ["profesional", "clinica"],
  // Autonomous 24/7 WhatsApp AI with handoff — labeled "WhatsApp IA"
  // on the landing page. Esencial included explicitly (upgraded from
  // draft-only) so all three paid plans get real auto-reply, drawing
  // from their own aiResponseLimitMonthly.
  ai_autoreply: ["esencial", "profesional", "clinica"],
  // Esencial's whole AI pitch is "Zen redacta y tú apruebas" — the
  // human-reviewed suggest-a-reply button in the WhatsApp composer
  // (POST /api/ai/draft). Trial explicitly does NOT get this even
  // though it now has a small AI response budget (courtesy cap is for
  // the copilot only, see ai_copilot below) — otherwise raising that
  // budget above 0 would silently unlock WhatsApp AI drafting too.
  ai_draft: ["esencial", "profesional", "clinica"],
  // The free trial gets the WhatsApp channel itself too (courtesy —
  // see the landing page's trial card), just not the AI/automation
  // layers on top of it.
  whatsapp_inbox: ["trial", "esencial", "profesional", "clinica"],
  // Same X'd-out line as automations on the Esencial card —
  // "Campañas de difusión por WhatsApp" is a Profesional pf-new item.
  broadcasts: ["profesional", "clinica"],
  // "Mini-sitio propio del consultorio" is a Profesional-only pf-new
  // line item — not on Esencial's feature list.
  landing_builder: ["profesional", "clinica"],
  // Recordatorios escalados de conversaciones sin responder. No tiene una
  // pantalla propia (es un comportamiento de fondo del inbox, gateado en el
  // cron), pero se lista aquí para respetar el override por cuenta del
  // platform-admin. Función premium → Profesional+.
  conversation_reminders: ["profesional", "clinica"],
  // Horarios de servicio por consultorio + multi-ubicación. La reserva
  // pública de Esencial sigue funcionando con los bloques del médico; esto
  // añade el horario de clínica por consultorio y varias ubicaciones.
  // Esencial+.
  clinic_hours: ["esencial", "profesional", "clinica"],
  // Personalización link-in-bio de la página pública de reserva (colores,
  // portada, bio, botones de contacto/redes). La reserva básica sigue para
  // todos; la marca/personalización es Esencial+. La prueba gratuita
  // también la incluye (pedido explícito, para que el médico pueda dejar
  // su página de reserva lista desde el día uno).
  booking_page: ["trial", "esencial", "profesional", "clinica"],
  // Copiloto de IA hacia el personal de la clínica (chat con acceso a los
  // datos de la cuenta + acciones con confirmación). Consume el mismo
  // presupuesto mensual de respuestas que ai_draft/ai_autoreply → Esencial+.
  // La prueba gratuita también lo tiene, pero con un tope de cortesía muy
  // chico (PLAN_CONFIG.trial.aiResponseLimitMonthly) — es la única forma
  // en que un plan Prueba puede gastar ese presupuesto de IA (ver ai_draft).
  ai_copilot: ["trial", "esencial", "profesional", "clinica"],
  // Cobro de anticipo al reservar en línea (Stripe / Mercado Pago /
  // Clip, según lo que traiga la cuenta). La reserva pública básica
  // sigue gratis para todos; cobrar por adelantado es Esencial+. La
  // prueba gratuita también la incluye (pedido explícito) — la pasarela
  // es la cuenta PROPIA de la clínica en el proveedor de pagos, no la
  // suscripción de la clínica con Zentro Med.
  payment_gateway: ["trial", "esencial", "profesional", "clinica"],
  // Formulario de admisión / historia clínica por médico, embebido en el
  // asistente de reserva pública. Igual que booking_page/clinic_hours: la
  // reserva básica sigue funcionando para todos, personalizar el cuestionario
  // de admisión es Esencial+.
  intake_forms: ["esencial", "profesional", "clinica"],
};

export function planHasFeature(plan: Plan, feature: GatedFeature): boolean {
  return FEATURE_MIN_PLAN[feature].includes(plan);
}

/**
 * Plan default, unless a platform admin explicitly overrode this
 * feature for the account (see 057_account_feature_overrides.sql) —
 * an override always wins, in either direction.
 */
export function resolveFeatureAccess(
  plan: Plan,
  feature: GatedFeature,
  overrides: FeatureOverrides | null | undefined,
): boolean {
  const override = overrides?.[feature];
  if (override !== undefined) return override;
  return planHasFeature(plan, feature);
}
