import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'

/**
 * GET/PUT /api/ai/copilot/profile  (agent+, plan premium)
 *
 * Perfil base del copiloto por médico (onboarding + edición). GET devuelve
 * el perfil actual y si ya completó el onboarding. PUT lo guarda (upsert),
 * marcando onboarded_at la primera vez. RLS lo aísla por usuario.
 */

const TONES = new Set(['formal', 'cercano', 'breve'])

async function assertFeature(
  supabase: Awaited<ReturnType<typeof requireRole>>['supabase'],
  accountId: string,
): Promise<boolean> {
  const { data: account } = await supabase
    .from('accounts')
    .select('plan, feature_overrides')
    .eq('id', accountId)
    .maybeSingle<{ plan: Plan; feature_overrides: FeatureOverrides | null }>()
  return !!account && resolveFeatureAccess(account.plan, 'ai_copilot', account.feature_overrides)
}

export async function GET() {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')
    if (!(await assertFeature(supabase, accountId))) {
      return NextResponse.json({ error: 'feature_not_available' }, { status: 403 })
    }
    const { data } = await supabase
      .from('ai_copilot_profile')
      .select('address_as, specialty, tone, base_context, onboarded_at')
      .eq('user_id', userId)
      .maybeSingle()
    return NextResponse.json({
      onboarded: !!data?.onboarded_at,
      profile: data
        ? {
            addressAs: data.address_as,
            specialty: data.specialty,
            tone: data.tone,
            baseContext: data.base_context,
          }
        : null,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')
    const limit = checkRateLimit(`ai-copilot-profile:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)
    if (!(await assertFeature(supabase, accountId))) {
      return NextResponse.json({ error: 'El copiloto de IA está disponible en planes de pago.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const str = (v: unknown, max: number) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
    const tone = typeof body?.tone === 'string' && TONES.has(body.tone) ? body.tone : null

    const { error } = await supabase.from('ai_copilot_profile').upsert(
      {
        user_id: userId,
        account_id: accountId,
        address_as: str(body?.addressAs, 120),
        specialty: str(body?.specialty, 200),
        tone,
        base_context: str(body?.baseContext, 2000),
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('[ai/copilot/profile] upsert error:', error)
      return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
