import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_CONFIG, type Plan } from '@/lib/billing-platform/plans'

export interface AiQuotaStatus {
  /** Tokens spent so far this calendar month (prompt + completion, both auto-reply and draft). */
  used: number
  /** Plan's monthly cap, or null when the plan has no cap. */
  limit: number | null
  exceeded: boolean
}

function monthStartUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Sums this account's `ai_usage_log.total_tokens` since the start of
 * the current UTC calendar month and compares it against
 * `PLAN_CONFIG[plan].aiTokenLimitMonthly`. Checked BEFORE calling the
 * provider (auto-reply's dispatch, the draft route) — by the time
 * usage is logged the (BYO-key) API cost already happened, so this is
 * the only point that can actually prevent going over.
 *
 * Fails open: a query error returns `exceeded: false` rather than
 * blocking a reply the customer is waiting on over a transient DB
 * hiccup — same posture as `logAiUsage`.
 */
export async function getAiTokenQuotaStatus(
  db: SupabaseClient,
  accountId: string,
): Promise<AiQuotaStatus> {
  const { data: account } = await db
    .from('accounts')
    .select('plan')
    .eq('id', accountId)
    .maybeSingle()
  const plan = (account?.plan as Plan | undefined) ?? 'trial'
  const limit = PLAN_CONFIG[plan].aiTokenLimitMonthly

  if (limit === null) return { used: 0, limit: null, exceeded: false }

  const { data, error } = await db
    .from('ai_usage_log')
    .select('total_tokens')
    .eq('account_id', accountId)
    .gte('created_at', monthStartUtc())

  if (error) {
    console.error('[ai quota] usage sum query failed:', error)
    return { used: 0, limit, exceeded: false }
  }

  const used = (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0)
  return { used, limit, exceeded: used >= limit }
}
