import { describe, it, expect } from 'vitest'
import { getAiResponseQuotaStatus } from './quota'

function makeDb(
  plan: string,
  usageCount: number | null,
  usageError: unknown = null,
  accountOverrides: { ai_access_blocked?: boolean; ai_response_limit_override?: number | null } = {},
) {
  return {
    from(table: string) {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { plan, ...accountOverrides }, error: null }),
            }),
          }),
        }
      }
      if (table === 'ai_usage_log') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: usageCount, error: usageError }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('getAiResponseQuotaStatus', () => {
  it('clinica gets its 6000/mo cap and is not exceeded when under it', async () => {
    const db = makeDb('clinica', 40)
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status).toEqual({ used: 40, limit: 6000, exceeded: false, blocked: false })
  })

  it('counts usage rows and flags exceeded once at/over the cap', async () => {
    const db = makeDb('esencial', 310)
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.used).toBe(310)
    expect(status.limit).toBe(300)
    expect(status.exceeded).toBe(true)
  })

  it('under the cap is not exceeded', async () => {
    const db = makeDb('esencial', 10)
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.exceeded).toBe(false)
  })

  it('fails open on a query error', async () => {
    const db = makeDb('esencial', null, { message: 'boom' })
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.exceeded).toBe(false)
  })

  it('an admin block short-circuits regardless of plan or usage', async () => {
    const db = makeDb('clinica', null, null, { ai_access_blocked: true })
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status).toEqual({ used: 0, limit: 0, exceeded: true, blocked: true })
  })

  it('an admin response-limit override replaces the plan default', async () => {
    const db = makeDb('esencial', 5, null, { ai_response_limit_override: 1 })
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.limit).toBe(1)
    expect(status.exceeded).toBe(true)
    expect(status.blocked).toBe(false)
  })

  it('an override of 0 blocks usage even on an unlimited plan', async () => {
    const db = makeDb('clinica', 0, null, { ai_response_limit_override: 0 })
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.limit).toBe(0)
    expect(status.exceeded).toBe(true)
  })

  it('defaults to the trial plan when the account row is missing', async () => {
    const db = {
      from(table: string) {
        if (table === 'accounts') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }
        }
        return {
          select: () => ({ eq: () => ({ gte: () => Promise.resolve({ count: 0, error: null }) }) }),
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const status = await getAiResponseQuotaStatus(db, 'acct-1')
    expect(status.limit).toBe(0)
  })
})
