import type { CSSProperties } from "react";
import { MessageCircle, Phone, MapPin, Mail, Globe, Plus, CalendarCheck, Clock } from "lucide-react";

import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons/social-icons";
import { BookingWidget } from "./booking-widget";
import {
  resolveBookingBlocks,
  type BookingPageConfig,
  type PublicBookingConfig,
} from "@/lib/scheduling/public-booking";

const DEFAULT_ACCENT = "#4ade5a";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** "Consulta y valoración" → "CV" — a cheap, always-available stand-in
 *  for a treatment icon/photo, same idea as an avatar's initials. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

export interface BookingPagePreviewProps {
  page: BookingPageConfig;
  accountName: string;
  accountLogoUrl: string | null;
  address: string | null;
  serviceTypes: { id: string; name: string; duration_minutes: number; price: number | null }[];
  businessHours: { configured: boolean; open: boolean; closesAtLabel: string | null };
  currency?: string;
  /** true en la página pública real (embebe el widget de reserva
   *  funcional); false en la vista previa del panel de staff, donde en
   *  su lugar se muestra un marcador estático — nunca se deja que una
   *  vista previa cree una cita real por accidente. */
  interactive: boolean;
  slug?: string;
  bookingConfig?: PublicBookingConfig;
}

export function BookingPagePreview({
  page,
  accountName,
  accountLogoUrl,
  address,
  serviceTypes,
  businessHours,
  currency = "USD",
  interactive,
  slug,
  bookingConfig,
}: BookingPagePreviewProps) {
  const p = page ?? {};
  const accent = p.accentColor || DEFAULT_ACCENT;
  const logo = p.logoUrl || accountLogoUrl;
  const headline = p.headline || accountName;
  const tagline = p.tagline;
  const cover = p.coverImageUrl;
  const coverColor = p.coverColor || accent;
  const blocks = resolveBookingBlocks(p).filter((b) => b.enabled);

  const accentVars = {
    "--primary": accent,
    "--primary-hover": accent,
    "--primary-foreground": "#ffffff",
    "--ring": accent,
    "--primary-soft": `color-mix(in srgb, ${accent} 12%, transparent)`,
    "--primary-soft-2": `color-mix(in srgb, ${accent} 22%, transparent)`,
  } as CSSProperties;

  const contact = p.contact ?? {};
  const social = p.social ?? {};
  const mapHref = contact.mapUrl || (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null);

  const socialLinks = [
    { url: social.instagram, Icon: InstagramIcon, label: "Instagram" },
    { url: social.facebook, Icon: FacebookIcon, label: "Facebook" },
    { url: social.tiktok, Icon: TikTokIcon, label: "TikTok" },
    { url: social.web, Icon: Globe, label: "Sitio web" },
  ].filter((s) => !!s.url);

  let priceFormatter: Intl.NumberFormat | null = null;
  try {
    priceFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    priceFormatter = null;
  }

  return (
    <div style={accentVars} className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-foreground">
      {/* Portada + logo */}
      <div
        className="relative h-28 bg-center bg-cover"
        style={cover ? { backgroundImage: `url(${cover})` } : { backgroundColor: coverColor }}
      >
        <div className="absolute -bottom-9 left-1/2 flex size-[72px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-[3px] border-card bg-primary-soft">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- account-controlled upload
            <img src={logo} alt="" className="size-full object-cover" />
          ) : (
            <Plus className="size-9" style={{ color: accent }} />
          )}
        </div>
      </div>

      {/* Cabecera */}
      <div className="px-5 pb-2 pt-12 text-center">
        <h1 className="text-lg font-semibold">{headline}</h1>
        {tagline ? <p className="mt-0.5 text-sm text-muted-foreground">{tagline}</p> : null}
        {p.bio ? <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{p.bio}</p> : null}
      </div>

      {blocks.map((block) => {
        switch (block.id) {
          case "whatsapp":
            return contact.whatsapp ? (
              <div key="whatsapp" className="px-5 pb-1 pt-3">
                <a
                  href={`https://wa.me/${onlyDigits(contact.whatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white"
                  style={{ backgroundColor: accent }}
                >
                  <MessageCircle className="size-[18px]" /> Escríbenos por WhatsApp
                </a>
              </div>
            ) : null;

          case "booking":
            return (
              <div key="booking" className="px-5 pb-1 pt-3">
                {interactive && slug && bookingConfig ? (
                  <BookingWidget slug={slug} config={bookingConfig} />
                ) : (
                  <>
                    <div
                      className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
                      style={{ border: `1.5px solid ${accent}`, color: accent }}
                    >
                      <CalendarCheck className="size-[18px]" /> Agendar cita en línea
                    </div>
                    {businessHours.configured ? (
                      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        {businessHours.open
                          ? businessHours.closesAtLabel
                            ? `Abierto ahora · cierra a las ${businessHours.closesAtLabel}`
                            : "Abierto ahora"
                          : "Cerrado ahora"}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            );

          case "services":
            return serviceTypes.length > 0 ? (
              <div key="services" className="px-4 pb-2 pt-3">
                <p className="mb-2 ml-1 text-xs text-muted-foreground">Tratamientos</p>
                <div className="space-y-1.5">
                  {serviceTypes.slice(0, 8).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: "var(--primary-soft)", color: accent }}
                      >
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.duration_minutes} min</p>
                      </div>
                      {s.price != null ? (
                        <span className="shrink-0 text-xs font-semibold" style={{ color: accent }}>
                          {priceFormatter ? priceFormatter.format(s.price) : s.price}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null;

          case "social":
            return socialLinks.length > 0 ? (
              <div key="social" className="flex flex-wrap gap-2 px-5 pb-1 pt-2">
                {socialLinks.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-medium"
                  >
                    <Icon className="size-4" style={{ color: accent }} /> {label}
                  </a>
                ))}
              </div>
            ) : null;

          case "location":
            return contact.phone || mapHref || contact.email || address ? (
              <div key="location" className="space-y-2 px-5 pb-4 pt-2">
                {contact.phone || mapHref || contact.email ? (
                  <div className="flex flex-wrap gap-2">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-medium"
                      >
                        <Phone className="size-4" style={{ color: accent }} /> Llamar
                      </a>
                    ) : null}
                    {mapHref ? (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-medium"
                      >
                        <MapPin className="size-4" style={{ color: accent }} /> Cómo llegar
                      </a>
                    ) : null}
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-medium"
                      >
                        <Mail className="size-4" style={{ color: accent }} /> Correo
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {address ? <p className="text-center text-[11px] text-muted-foreground">{address}</p> : null}
              </div>
            ) : null;

          default:
            return null;
        }
      })}
    </div>
  );
}
