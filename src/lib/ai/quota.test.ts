import { describe, it, expect } from 'vitest'
import { getAiTokenQuotaStatus } from './quota'

function makeDb(plan: string, usageRows: { total_tokens: number }[] | null, usageError: unknown = null) {
  return {
    from(table: string) {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { plan }, error: null }),
            }),
          }),
        }
      }
      if (table === 'ai_usage_log') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ data: usageRows, error: usageError }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('getAiTokenQuotaStatus', () => {
  it('unlimited plan never queries usage and never exceeds', async () => {
    const db = makeDb('zentro_salud_pro', null)
    const status = await getAiTokenQuotaStatus(db, 'acct-1')
    expect(status).toEqual({ used: 0, limit: null, exceeded: false })
  })

  it('sums usage rows and flags exceeded once at/over the cap', async () => {
    const db = makeDb('standalone', [{ total_tokens: 60_000 }, { total_tokens: 50_000 }])
    const status = await getAiTokenQuotaStatus(db, 'acct-1')
    expect(status.used).toBe(110_000)
    expect(status.limit).toBe(100_000)
    expect(status.exceeded).toBe(true)
  })

  it('under the cap is not exceeded', async () => {
    const db = makeDb('standalone', [{ total_tokens: 10_000 }])
    const status = await getAiTokenQuotaStatus(db, 'acct-1')
    expect(status.exceeded).toBe(false)
  })

  it('fails open on a query error', async () => {
    const db = makeDb('standalone', null, { message: 'boom' })
    const status = await getAiTokenQuotaStatus(db, 'acct-1')
    expect(status.exceeded).toBe(false)
  })

  it('defaults to the trial plan when the account row is missing', async () => {
    const db = {
      from(table: string) {
        if (table === 'accounts') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }
        }
        return {
          select: () => ({ eq: () => ({ gte: () => Promise.resolve({ data: [], error: null }) }) }),
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const status = await getAiTokenQuotaStatus(db, 'acct-1')
    expect(status.limit).toBe(20_000)
  })
})
