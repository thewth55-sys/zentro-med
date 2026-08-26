import { AI_PROVIDER_DEFAULT_MODEL } from '../defaults'
import type { AiConfig } from '../types'

/**
 * Config de IA GESTIONADA por la plataforma para el copiloto.
 *
 * A diferencia del auto-reply/borradores (que usan la clave BYO de cada
 * cuenta, `ai_configs`), el copiloto está pensado para médicos que no van
 * a configurar una API por su cuenta. Usa la clave gestionada del entorno
 * (`ZENTRO_MANAGED_OPENAI_API_KEY`, la misma con la que el webhook de
 * Stripe auto-provisiona IA en cuentas de pago). Solo aplica a planes
 * Profesional/Clínica (gateado en el endpoint), así que el costo lo asume
 * la plataforma para esos planes.
 *
 * El modelo es override-able con `ZENTRO_COPILOT_MODEL` (los IDs de modelo
 * cambian seguido); por defecto usa el mismo que el resto del stack.
 */
export function buildManagedAiConfig(): AiConfig | null {
  const apiKey = process.env.ZENTRO_MANAGED_OPENAI_API_KEY
  if (!apiKey) return null
  return {
    provider: 'openai',
    model: process.env.ZENTRO_COPILOT_MODEL || AI_PROVIDER_DEFAULT_MODEL.openai,
    apiKey,
    systemPrompt: null,
    isActive: true,
    autoReplyEnabled: false,
    autoReplyMaxPerConversation: 0,
    handoffAgentId: null,
    embeddingsApiKey: null,
    agendaAccessEnabled: false,
  }
}

/** Clave gestionada cruda (para llamadas que no pasan por generateReply,
 *  p. ej. la transcripción de audio con Whisper). */
export function managedOpenAiKey(): string | null {
  return process.env.ZENTRO_MANAGED_OPENAI_API_KEY ?? null
}
