import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET/PUT/DELETE /api/ai/copilot/history  (agent+)
 *
 * Historial del chat de Zen por médico, para que siga al usuario entre
 * dispositivos. GET devuelve los turnos guardados; PUT los reemplaza
 * (upsert, se acotan a los últimos 40); DELETE lo limpia. RLS por usuario.
 */

const MAX_TURNS = 40

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

export async function GET() {
  try {
    const { supabase, userId } = await requireRole('agent')
    const { data } = await supabase
      .from('ai_copilot_history')
      .select('turns')
      .eq('user_id', userId)
      .maybeSingle<{ turns: Turn[] }>()
    return NextResponse.json({ turns: Array.isArray(data?.turns) ? data.turns : [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')
    const limit = checkRateLimit(`ai-copilot-history:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const raw: unknown[] = Array.isArray(body?.turns) ? body.turns : []
    const turns: Turn[] = []
    for (const t of raw) {
      if (!t || typeof t !== 'object') continue
      const role = (t as { role?: unknown }).role
      const content = (t as { content?: unknown }).content
      if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
        turns.push({ role, content })
      }
    }

    const { error } = await supabase.from('ai_copilot_history').upsert(
      {
        user_id: userId,
        account_id: accountId,
        turns: turns.slice(-MAX_TURNS),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('[ai/copilot/history] upsert error:', error)
      return NextResponse.json({ error: 'No se pudo guardar el historial.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE() {
  try {
    const { supabase, userId } = await requireRole('agent')
    await supabase.from('ai_copilot_history').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
