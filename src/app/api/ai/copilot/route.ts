import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { buildManagedAiConfig } from '@/lib/ai/copilot/managed-config'
import { generateReply } from '@/lib/ai/generate'
import { logAiUsage } from '@/lib/ai/usage'
import { getAiResponseQuotaStatus } from '@/lib/ai/quota'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { AiError, type ChatMessage } from '@/lib/ai/types'
import { resolveFeatureAccess, type FeatureOverrides } from '@/lib/billing-platform/features'
import type { Plan } from '@/lib/billing-platform/plans'
import {
  COPILOT_TOOLS,
  buildCopilotSystemPrompt,
  createCopilotExecutor,
  type CopilotProfile,
  type ProposedAction,
} from '@/lib/ai/copilot/tools'

/**
 * POST /api/ai/copilot  (agent+)
 *
 * Copiloto de IA hacia el usuario (personal de la clínica). Body:
 *   { messages: {role:'user'|'assistant', content:string}[] }
 * Devuelve:
 *   { reply, proposedActions } — `proposedActions` son escrituras que el
 *   modelo propuso y que el usuario debe confirmar en /execute.
 *
 * Usa el proveedor/clave/cuota de la cuenta (BYO). Las herramientas de
 * lectura corren con el cliente RLS-scoped, así que quedan limitadas a la
 * cuenta del usuario; las de acción NO se ejecutan aquí.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const userLimit = checkRateLimit(`ai-copilot:${userId}`, RATE_LIMITS.aiDraft)
    if (!userLimit.success) return rateLimitResponse(userLimit)
    const accountLimit = checkRateLimit(`ai-copilot-acct:${accountId}`, RATE_LIMITS.aiDraftAccount)
    if (!accountLimit.success) return rateLimitResponse(accountLimit)

    // Gate premium (server-side; el PlanGate del cliente no es barrera real).
    const { data: account } = await supabase
      .from('accounts')
      .select('name, plan, feature_overrides')
      .eq('id', accountId)
      .maybeSingle<{ name: string | null; plan: Plan; feature_overrides: FeatureOverrides | null }>()
    const copilotEnabled = account
      ? resolveFeatureAccess(account.plan, 'ai_copilot', account.feature_overrides)
      : false
    if (!copilotEnabled) {
      return NextResponse.json(
        { error: 'El copiloto de IA está disponible en planes de pago.', code: 'feature_not_available' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)
    const rawMessages: unknown[] = Array.isArray(body?.messages) ? body.messages : []
    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }
    // Valida y acota el historial que reenviamos (últimos 20 turnos).
    const messages: ChatMessage[] = []
    for (const m of rawMessages) {
      if (!m || typeof m !== 'object') continue
      const role = (m as { role?: unknown }).role
      const content = (m as { content?: unknown }).content
      if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
        messages.push({ role, content })
      }
    }
    const trimmed = messages.slice(-20)
    if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
    }

    // Config GESTIONADA por la plataforma (no la BYO de la cuenta): el
    // copiloto es una función de planes de pago y el médico no configura
    // ninguna API. Ver managed-config.ts.
    const config = buildManagedAiConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'El copiloto no está configurado en el servidor.', code: 'copilot_not_configured' },
        { status: 503 },
      )
    }

    const quota = await getAiResponseQuotaStatus(supabase, accountId)
    if (quota.blocked) {
      return NextResponse.json(
        { error: 'AI access has been disabled for this account by an administrator.', code: 'ai_access_blocked' },
        { status: 403 },
      )
    }
    if (quota.exceeded) {
      return NextResponse.json(
        {
          error: `Your plan's monthly AI usage limit has been reached (${quota.used.toLocaleString()}/${quota.limit?.toLocaleString()} tokens).`,
          code: 'ai_quota_exceeded',
        },
        { status: 429 },
      )
    }

    // Perfil base (onboarding) + memoria persistente de ESTE médico (RLS:
    // solo lo suyo) → al prompt.
    const [{ data: profileRow }, { data: memoryRows }] = await Promise.all([
      supabase
        .from('ai_copilot_profile')
        .select('address_as, specialty, tone, base_context')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('ai_copilot_memory')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    const profile: CopilotProfile | null = profileRow
      ? {
          addressAs: profileRow.address_as,
          specialty: profileRow.specialty,
          tone: profileRow.tone,
          baseContext: profileRow.base_context,
        }
      : null
    const memories = (memoryRows ?? []).map((m) => m.content as string)

    const proposals: ProposedAction[] = []
    const executeTool = createCopilotExecutor({ supabase, accountId, userId }, proposals)
    const systemPrompt = buildCopilotSystemPrompt(account?.name ?? null, profile, memories)

    const { text, usage } = await generateReply({
      config,
      systemPrompt,
      messages: trimmed,
      tools: COPILOT_TOOLS,
      executeTool,
    })

    try {
      void logAiUsage(supabaseAdmin(), {
        accountId,
        conversationId: null,
        mode: 'copilot',
        provider: config.provider,
        model: config.model,
        usage,
      })
    } catch (logErr) {
      console.error('[ai/copilot] usage log skipped:', logErr)
    }

    return NextResponse.json({ reply: text, proposedActions: proposals })
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return toErrorResponse(err)
  }
}
