// ============================================================
// Shared HTML building blocks for every email this app sends directly
// via Resend — table-based layout (email-client-safe, no
// flexbox/grid), inline styles only (many clients strip <style>
// blocks).
//
// Three "shells" (visual chrome), matching the reviewed mockup:
//   - zenShell()      — dark header, security/auth emails. Never
//                        carries a clinic's own branding.
//   - internoShell()  — light header + "INTERNO" chip, internal
//                        team alerts (new booking, payment received).
//   - pacienteShell() — clinic's own logo/name in the header, Zentro
//                        only appears as a small footer attribution.
// Every email is built as: renderShellEmail({ shell, heading, blocks })
// where `blocks` is an array of pre-rendered HTML snippets from the
// p*() builders below (pText, pBoton, pTabla, pDestacado, ...).
// ============================================================

const ZENTRO_GREEN = "#4ade5a";
const ZENTRO_GREEN_DARK = "#1b5a2e";
const ZENTRO_ISOTIPO_URL = "https://med.zentrolabs.com/zentro-isotipo.png";

/**
 * Escapes the 5 characters HTML gives special meaning, for any
 * user-controlled string (a patient's name, phone, a WhatsApp
 * message) interpolated into a block before it's handed to
 * renderShellEmail. Without this, a patient could name themselves
 * `<a href="https://evil">...` on the public booking form and have
 * that render as a live link/markup in the internal team
 * notification email — no script execution (mail clients strip
 * `<script>`), but real HTML/link injection into a trusted email.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ------------------------------------------------------------
// Shells
// ------------------------------------------------------------

export interface EmailShell {
  headBg: string;
  headBorder?: string;
  brandName: string;
  brandFg: string;
  subtitle?: string | null;
  subtitleFg?: string;
  chipLabel?: string | null;
  chipBg?: string;
  chipFg?: string;
  logoUrl?: string | null;
  /** Used for the paciente shell when the clinic has no logoUrl — a colored initials bubble instead of an image. */
  initials?: string | null;
  initialsBg?: string;
  initialsFg?: string;
  /** Top accent bar + button color. */
  accentColor: string;
  footerNote: string;
}

/** Security/auth emails (confirmations, password reset, 2FA codes, signing OTPs). Never clinic-branded. */
export function zenShell(subtitle?: string | null): EmailShell {
  return {
    headBg: "#0B2A1E",
    brandName: "Zentro Med",
    brandFg: "#ffffff",
    subtitle: subtitle ?? "Seguridad de la cuenta",
    subtitleFg: "#8FC4A8",
    logoUrl: ZENTRO_ISOTIPO_URL,
    accentColor: "#0B2A1E",
    footerNote: "Este es un correo automático de Zentro Med, no es necesario responder.",
  };
}

/** Internal team alerts (new booking, payment received, platform-admin notices). */
export function internoShell(clinicName: string, opts?: { sub?: string; chip?: string | null }): EmailShell {
  return {
    headBg: "#ffffff",
    headBorder: "#EDF1EF",
    brandName: "Zentro Med",
    brandFg: "#0C1B14",
    subtitle: opts?.sub ?? null,
    subtitleFg: "#5B6B62",
    chipLabel: opts?.chip === undefined ? "INTERNO" : opts.chip,
    chipBg: "#EEF2F0",
    chipFg: "#5B6B62",
    logoUrl: ZENTRO_ISOTIPO_URL,
    accentColor: "#5B6B62",
    footerNote: `Notificación interna de ${clinicName} en Zentro Med.`,
  };
}

/** Patient-facing documents (invoices, quotes, recetas, consent/signature emails) — re-skinned to the clinic. */
export function pacienteShell(
  clinicName: string,
  opts?: { logoUrl?: string | null; accentColor?: string | null; chip?: string | null },
): EmailShell {
  const initials = clinicName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return {
    headBg: "#ffffff",
    headBorder: "#EDF1EF",
    brandName: clinicName,
    brandFg: "#0C1B14",
    chipLabel: opts?.chip ?? null,
    chipBg: "#E8F5EE",
    chipFg: "#0A5C37",
    logoUrl: opts?.logoUrl ?? null,
    initials: initials || "Z",
    initialsBg: "#E8F5EE",
    initialsFg: "#0A5C37",
    accentColor: opts?.accentColor || "#0E7C4A",
    footerNote: `Enviado por ${clinicName}.`,
  };
}

// ------------------------------------------------------------
// Content block builders — each returns a self-contained HTML
// snippet with its own top margin (the "gap" before it).
// ------------------------------------------------------------

export function pText(html: string): string {
  return `<p style="margin:16px 0 0 0; font-size:14px; line-height:1.6; color:#333;">${html}</p>`;
}

export function pSaludo(text: string): string {
  return `<p style="margin:18px 0 0 0; font-size:14px; font-weight:700; color:#1a1a1a;">${text}</p>`;
}

export function pBoton(label: string, href: string, opts?: { dark?: boolean; accentColor?: string | null }): string {
  const bg = opts?.dark ? "#0B2A1E" : opts?.accentColor || ZENTRO_GREEN;
  const fg = opts?.dark ? "#ffffff" : ZENTRO_GREEN_DARK;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:6px; background-color:${bg};">
    <a href="${href}" style="display:inline-block; padding:10px 20px; color:${fg}; font-weight:700; font-size:14px; text-decoration:none;">${label}</a>
  </td></tr></table>`;
}

export function pCodigo(code: string, meta?: string): string {
  return `<div style="margin-top:20px; text-align:center; padding:18px; background-color:#F4F5F4; border-radius:8px;">
    <span style="font-size:28px; font-weight:700; letter-spacing:6px; color:#0C1B14; font-family: 'Courier New', monospace;">${code}</span>
    ${meta ? `<p style="margin:8px 0 0 0; font-size:12px; color:#5B6B62;">${meta}</p>` : ""}
  </div>`;
}

export function pTabla(filas: { k: string; v: string }[]): string {
  const rows = filas
    .map(
      (f) => `<tr>
        <td style="padding:6px 0; font-size:13px; color:#5B6B62;">${f.k}</td>
        <td style="padding:6px 0; font-size:13px; color:#1a1a1a; font-weight:600; text-align:right;">${f.v}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px; border-top:1px solid #EDF1EF;">${rows}</table>`;
}

export function pNota(text: string): string {
  return `<p style="margin:22px 0 0 0; font-size:12px; line-height:1.5; color:#8A9A92;">${text}</p>`;
}

export function pAdjunto(filename: string, meta?: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="padding:10px 14px; background-color:#F4F5F4; border-radius:6px; font-size:13px; color:#1a1a1a;">
    📎 ${filename}${meta ? ` <span style="color:#8A9A92;">· ${meta}</span>` : ""}
  </td></tr></table>`;
}

export function pEnlace(text: string, href: string): string {
  return `<p style="margin:20px 0 0 0;"><a href="${href}" style="font-size:13px; font-weight:600; color:#0A5C37; text-decoration:none;">${text}</a></p>`;
}

export function pRecuadro(kicker: string, text: string): string {
  return `<div style="margin-top:20px; padding:14px 16px; background-color:#F4F5F4; border-radius:8px;">
    <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.5px; color:#5B6B62; text-transform:uppercase;">${kicker}</p>
    <p style="margin:0; font-size:13px; line-height:1.5; color:#333;">${text}</p>
  </div>`;
}

const DESTACADO_TONOS = {
  verde: { bg: "#F4FAF6", bd: "#D7EBE0", fg: "#0A5C37", valorFg: "#0F4E33" },
  ambar: { bg: "#FDF3E2", bd: "#F5E3C4", fg: "#7A5406", valorFg: "#7A5406" },
  rojo: { bg: "#FCEDEA", bd: "#F7DAD4", fg: "#B3382C", valorFg: "#8A3A30" },
} as const;

export function pDestacado(kicker: string, valor: string, meta: string, tono: keyof typeof DESTACADO_TONOS = "verde"): string {
  const t = DESTACADO_TONOS[tono];
  return `<div style="margin-top:20px; padding:16px; background-color:${t.bg}; border:1px solid ${t.bd}; border-radius:8px;">
    <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.5px; color:${t.fg}; text-transform:uppercase;">${kicker}</p>
    <p style="margin:0; font-size:20px; font-weight:700; color:${t.valorFg};">${valor}</p>
    <p style="margin:4px 0 0 0; font-size:12px; color:${t.fg};">${meta}</p>
  </div>`;
}

// ------------------------------------------------------------
// Composer
// ------------------------------------------------------------

export interface ShellEmailParams {
  shell: EmailShell;
  heading: string;
  /** Pre-rendered HTML snippets, in order — build with the p*() helpers above. */
  blocks: string[];
  /** Overrides the shell's default footer text for this one email. */
  footerNote?: string;
}

export function renderShellEmail(params: ShellEmailParams): string {
  const s = params.shell;
  const headerBorder = s.headBorder ? `border-bottom:1px solid ${s.headBorder};` : "";

  const logoCell = s.logoUrl
    ? `<img src="${s.logoUrl}" width="32" height="32" alt="" style="display:block; border-radius:6px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:32px; height:32px;"><tr><td align="center" valign="middle" style="width:32px; height:32px; border-radius:16px; background-color:${s.initialsBg}; color:${s.initialsFg}; font-size:13px; font-weight:700;">${s.initials}</td></tr></table>`;

  const chip = s.chipLabel
    ? `<td style="vertical-align:middle; padding-left:8px;"><span style="display:inline-block; padding:2px 8px; border-radius:10px; background-color:${s.chipBg}; color:${s.chipFg}; font-size:10px; font-weight:700; letter-spacing:0.5px;">${s.chipLabel}</span></td>`
    : "";

  const subtitleRow = s.subtitle
    ? `<div style="font-size:11px; color:${s.subtitleFg};">${s.subtitle}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:560px; width:100%;">
            <tr>
              <td style="background-color:${s.accentColor}; height:6px; line-height:6px; font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background-color:${s.headBg}; ${headerBorder} padding:18px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">${logoCell}</td>
                    <td style="vertical-align:middle; padding-left:10px; font-size:15px; font-weight:700; color:${s.brandFg};">
                      ${s.brandName}
                      ${subtitleRow}
                    </td>
                    ${chip}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h1 style="margin:0; font-size:20px; color:#1a1a1a;">${params.heading}</h1>
                ${params.blocks.join("\n")}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px; border-top:1px solid #eee; margin-top:16px;">
                <p style="margin:16px 0 0 0; font-size:11px; color:#999;">
                  ${params.footerNote || s.footerNote}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
