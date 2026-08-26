import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'
import { managedOpenAiKey } from '@/lib/ai/copilot/managed-config'

const MAX_AUDIO_BYTES = 20 * 1024 * 1024 // 20 MB

/**
 * POST /api/ai/copilot/transcribe  (agent+, plan premium)
 *
 * Transcribe una nota de voz del médico (multipart, campo `audio`) usando
 * Whisper con la clave gestionada de la plataforma, y devuelve el texto
 * para que el copiloto lo procese. Pensado para que el médico dicte en vez
 * de escribir. No ejecuta ninguna acción — solo transcribe.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-copilot-audio:${userId}`, RATE_LIMITS.aiDraft)
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
      return NextResponse.json({ error: 'La transcripción no está configurada en el servidor.' }, { status: 503 })
    }

    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el audio.' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'El audio está vacío.' }, { status: 400 })
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'El audio es demasiado grande (máx. 20 MB).' }, { status: 413 })
    }

    const upstream = new FormData()
    upstream.append('file', file, file.name || 'audio.webm')
    upstream.append('model', process.env.ZENTRO_TRANSCRIBE_MODEL || 'whisper-1')
    upstream.append('language', 'es')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai/copilot/transcribe] upstream error:', res.status, errText)
      return NextResponse.json({ error: 'No se pudo transcribir el audio.' }, { status: 502 })
    }
    const data = (await res.json().catch(() => null)) as { text?: unknown } | null
    const text = typeof data?.text === 'string' ? data.text : ''
    return NextResponse.json({ text })
  } catch (err) {
    return toErrorResponse(err)
  }
}
