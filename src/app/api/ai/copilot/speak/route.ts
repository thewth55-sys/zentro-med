import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'
import { managedOpenAiKey } from '@/lib/ai/copilot/managed-config'

const MAX_CHARS = 4000

/** Limpia el texto para la lectura por voz: quita emojis y markdown para
 *  que la voz no lea "asterisco asterisco" ni describa los emojis. */
function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Lee un ajuste de voz (0–1) de env, con default y clamp. */
function envNum(v: string | undefined, def: number): number {
  const n = v === undefined ? NaN : Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(1, Math.max(0, n))
}

/**
 * POST /api/ai/copilot/speak  (agent+, plan premium)
 *
 * Convierte una respuesta del copiloto en voz y devuelve el audio mp3.
 * Usa ElevenLabs si está configurado (`ELEVENLABS_API_KEY` +
 * `ELEVENLABS_VOICE_ID`) para una voz más cálida y natural; si no, cae al
 * TTS de OpenAI con la clave gestionada. Bajo demanda (lo inicia el
 * usuario), para no reproducir datos clínicos en voz alta sin querer.
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

    const body = await request.json().catch(() => null)
    const raw = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : ''
    if (!raw) {
      return NextResponse.json({ error: 'Falta el texto.' }, { status: 400 })
    }
    const text = stripForSpeech(raw) || raw

    const audio = await synthesize(text)
    if (!audio) {
      return NextResponse.json({ error: 'No se pudo generar el audio.' }, { status: 502 })
    }
    return new NextResponse(audio, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/** Devuelve el mp3 (ArrayBuffer) o null si no hay proveedor configurado / falla. */
async function synthesize(text: string): Promise<ArrayBuffer | null> {
  const elKey = process.env.ELEVENLABS_API_KEY
  const elVoice = process.env.ELEVENLABS_VOICE_ID

  // ElevenLabs: voz más cálida/natural (preferido si está configurado).
  if (elKey && elVoice) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`, {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
          // Entonación y calidez ajustables (0–1): stability más baja = más
          // expresiva/variada; style más alto = más cálida/emotiva.
          voice_settings: {
            stability: envNum(process.env.ELEVENLABS_STABILITY, 0.4),
            similarity_boost: envNum(process.env.ELEVENLABS_SIMILARITY, 0.8),
            style: envNum(process.env.ELEVENLABS_STYLE, 0.3),
            use_speaker_boost: process.env.ELEVENLABS_SPEAKER_BOOST !== 'false',
          },
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (res.ok) return await res.arrayBuffer()
      console.error('[ai/copilot/speak] ElevenLabs error:', res.status, await res.text().catch(() => ''))
    } catch (err) {
      console.error('[ai/copilot/speak] ElevenLabs threw:', err)
    }
    // Cae al respaldo de OpenAI si ElevenLabs falla.
  }

  // Respaldo: TTS de OpenAI con la clave gestionada.
  const openAiKey = managedOpenAiKey()
  if (!openAiKey) return null
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ZENTRO_TTS_MODEL || 'tts-1',
        voice: process.env.ZENTRO_TTS_VOICE || 'alloy',
        input: text,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (res.ok) return await res.arrayBuffer()
    console.error('[ai/copilot/speak] OpenAI TTS error:', res.status, await res.text().catch(() => ''))
    return null
  } catch (err) {
    console.error('[ai/copilot/speak] OpenAI TTS threw:', err)
    return null
  }
}
