import { renderShellEmail, zenShell, escapeHtml, pText, pCodigo, pTabla, pNota } from "@/lib/email/branded-template";
import { sendEmail } from "@/lib/email/resend-client";

export interface Login2faEmailArgs {
  to: string;
  code: string;
  /** Contexto opcional del intento, para que el usuario detecte fraude. */
  device?: string | null;
  location?: string | null;
}

const HORA_FMT = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true });

/** Correo branded con el código de verificación de inicio de sesión. */
export async function sendLogin2faEmail(a: Login2faEmailArgs): Promise<void> {
  const filas = [
    a.device ? { k: "Dispositivo", v: escapeHtml(a.device) } : null,
    a.location ? { k: "Ubicación", v: escapeHtml(a.location) } : null,
    { k: "Hora", v: `Hoy, ${HORA_FMT.format(new Date())}` },
  ].filter((f): f is { k: string; v: string } => f !== null);

  const html = renderShellEmail({
    shell: zenShell(),
    heading: "Código de inicio de sesión",
    blocks: [
      pText("Detectamos un inicio de sesión desde un dispositivo nuevo. Usa este código para continuar:"),
      pCodigo(escapeHtml(a.code), "Vence en 10 minutos"),
      pTabla(filas),
      pNota("Si no fuiste tú, no compartas este código y cambia tu contraseña de inmediato."),
    ],
  });

  await sendEmail({ to: a.to, subject: "Tu código de inicio de sesión — Zentro Med", html });
}
