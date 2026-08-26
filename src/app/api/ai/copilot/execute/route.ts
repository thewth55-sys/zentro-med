import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'
import { executeCopilotAction } from '@/lib/ai/copilot/tools'

/**
 * POST /api/ai/copilot/execute  (agent+)
 *
 * Ejecuta una acción que el copiloto PROPUSO y el usuario CONFIRMÓ.
 * El modelo nunca llega aquí: la escritura la dispara el click humano.
 * Body: { type, params }. Corre con el cliente RLS-scoped del usuario,
 * así que la escritura queda limitada a su cuenta.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-copilot-exec:${userId}`, RATE_LIMITS.aiDraft)
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
    const type = typeof body?.type === 'string' ? body.type : ''
    const params =
      body && typeof body.params === 'object' && body.params !== null
        ? (body.params as Record<string, unknown>)
        : {}
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const result = await executeCopilotAction({ supabase, accountId, userId }, type, params)

    // Rastro de auditoría (best-effort — nunca debe tumbar la respuesta).
    try {
      await supabase.from('ai_copilot_actions').insert({
        account_id: accountId,
        user_id: userId,
        action_type: type,
        params,
        status: result.ok ? 'ok' : 'failed',
        error: result.ok ? null : result.message,
      })
    } catch (auditErr) {
      console.error('[ai/copilot/execute] audit log skipped:', auditErr)
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, message: result.message })
  } catch (err) {
    return toErrorResponse(err)
  }
}
