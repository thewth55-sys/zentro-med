import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'
import { managedOpenAiKey } from '@/lib/ai/copilot/managed-config'

const MAX_CHARS = 4000

/**
 * POST /api/ai/copilot/speak  (agent+, plan premium)
 *
 * Convierte una respuesta del copiloto en voz (TTS de OpenAI con la clave
 * gestionada) y devuelve el audio mp3. Pensado para que el médico ESCUCHE
 * la respuesta — bajo demanda (lo inicia el usuario), no automático, para
 * no reproducir datos clínicos en voz alta sin querer.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-copilot-tts:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: account } = await supabase
      .from('accounts')
      .select('plan, feature_overrides')
      .eq('id', accountId)
      .maybeSingle<{ plan: Plan; feature_overrides: FeatureOverrides | null }>()
    if (!account || !resolveFeatureAccess(account.plan, 'ai_copilot', account.feature_overrides)) {
      return NextResponse.json(
        { error: 'El copiloto de IA está disponible en planes de pago.', code: 'feature_not_available' },
        { status: 403 },
      )
    }

    const apiKey = managedOpenAiKey()
    if (!apiKey) {
      return NextResponse.json({ error: 'La síntesis de voz no está configurada en el servidor.' }, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : ''
    if (!text) {
      return NextResponse.json({ error: 'Falta el texto.' }, { status: 400 })
    }

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ZENTRO_TTS_MODEL || 'tts-1',
        voice: process.env.ZENTRO_TTS_VOICE || 'alloy',
        input: text,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai/copilot/speak] upstream error:', res.status, errText)
      return NextResponse.json({ error: 'No se pudo generar el audio.' }, { status: 502 })
    }

    const audio = await res.arrayBuffer()
    return new NextResponse(audio, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
