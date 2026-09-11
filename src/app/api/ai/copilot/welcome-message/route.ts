import { NextResponse } from 'next/server'

import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { buildManagedAiConfig } from '@/lib/ai/copilot/managed-config'
import { generateReply } from '@/lib/ai/generate'
import { logAiUsage } from '@/lib/ai/usage'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { AiError } from '@/lib/ai/types'
import { COPILOT_NAME } from '@/lib/ai/copilot/branding'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'

/**
 * POST /api/ai/copilot/welcome-message  (agent+, plan premium)
 *
 * Genera el texto del saludo de bienvenida que se reproduce en voz justo
 * después de que un médico termina el onboarding del copiloto (ver
 * `seedGreeting` en copilot-chat.tsx). Antes era una plantilla fija; esto
 * lo redacta el mismo modelo del copiloto usando lo que el médico
 * respondió (cómo dirigirse a él, especialidad, tono, contexto), sin
 * herramientas ni acciones — una sola generación de texto plano.
 */
export async function POST() {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')
    const limit = checkRateLimit(`ai-copilot-welcome:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: account } = await supabase
      .from('accounts')
      .select('name, plan, feature_overrides')
      .eq('id', accountId)
      .maybeSingle<{ name: string; plan: Plan; feature_overrides: FeatureOverrides | null }>()
    if (!account || !resolveFeatureAccess(account.plan, 'ai_copilot', account.feature_overrides)) {
      return NextResponse.json({ error: 'feature_not_available' }, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('ai_copilot_profile')
      .select('address_as, specialty, tone, base_context')
      .eq('user_id', userId)
      .maybeSingle()

    const config = buildManagedAiConfig()
    if (!config) {
      return NextResponse.json({ error: 'El copiloto de IA no está configurado.' }, { status: 500 })
    }

    const facts = [
      `Nombre de la clínica: ${account.name}`,
      profile?.address_as ? `Cómo dirigirse al médico: ${profile.address_as}` : null,
      profile?.specialty ? `Especialidad o giro: ${profile.specialty}` : null,
      profile?.tone ? `Tono que el médico eligió: ${profile.tone}` : null,
      profile?.base_context ? `Contexto que pidió tener siempre presente: ${profile.base_context}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n')

    const systemPrompt =
      `Eres ${COPILOT_NAME}, el copiloto de IA de una clínica dentro de Zentro Med. ` +
      'Un médico acaba de terminar de configurarte por primera vez. Redacta el mensaje de ' +
      'bienvenida que le vas a decir EN VOZ ALTA justo ahora: máximo 4-5 líneas, saluda usando ' +
      'los datos que te dieron, menciona brevemente 2-3 cosas en las que puedes ayudarle ' +
      '(consultar su día, agendar/confirmar/cancelar citas, enviar WhatsApp, notas de evolución — ' +
      'siempre con su confirmación) y ciérralo invitándolo a escribirte o hablarte. Responde SOLO ' +
      'con el texto del saludo, sin comillas, sin markdown ni viñetas — es para lectura en voz, no ' +
      'para leerse en pantalla.'

    const { text, usage } = await generateReply({
      config,
      systemPrompt,
      messages: [{ role: 'user', content: facts || 'El médico no dio más datos.' }],
    })

    void logAiUsage(supabaseAdmin(), {
      accountId,
      conversationId: null,
      mode: 'copilot',
      provider: config.provider,
      model: config.model,
      usage,
    })

    return NextResponse.json({ text: text.trim() })
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return toErrorResponse(err)
  }
}
