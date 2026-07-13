import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  exchangeEmbeddedSignupCode,
  getWabaPhoneNumbers,
  verifyPhoneNumber,
  registerPhoneNumber,
  subscribeWabaToApp,
} from '@/lib/whatsapp/meta-api'
import { encrypt } from '@/lib/whatsapp/encryption'

/**
 * POST /api/whatsapp/embedded-signup
 *
 * Backend half of WhatsApp Embedded Signup — the frontend button
 * (components/settings/whatsapp-embedded-signup-button.tsx) runs
 * Meta's hosted popup via the Facebook JS SDK and hands this route
 * the resulting `code` (+ `waba_id`, and `phone_number_id` when Meta's
 * event included it). This is a NEW, separate route rather than a
 * third branch bolted onto POST /api/whatsapp/config — that route's
 * manual-paste flow is live and working; this keeps it untouched
 * while duplicating the small provisioning tail (register + subscribe
 * + save) it already has. A follow-up can de-duplicate once this path
 * has been proven against a real Meta App.
 *
 * Same account-scoping as the manual route: any authenticated member
 * of the account can complete this, no extra role floor — matching
 * the existing route's permission level rather than introducing a
 * mismatch between the two paths for the same underlying feature.
 *
 * Unlike the manual flow, there's no PIN field in the UI — Embedded
 * Signup customers verify their number's OTP inside Meta's own popup,
 * so /register is called with a PIN this route generates itself
 * (only ever used for that one call; nothing depends on the customer
 * knowing it).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (profileError || !accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { code, waba_id: wabaId, phone_number_id: suppliedPhoneNumberId } = body

    if (!code || !wabaId) {
      return NextResponse.json(
        { error: 'code and waba_id are required' },
        { status: 400 },
      )
    }

    // Step 1: exchange the authorization code for a token.
    let accessToken: string
    try {
      const result = await exchangeEmbeddedSignupCode({ code })
      accessToken = result.accessToken
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta OAuth error'
      console.error('[embedded-signup] code exchange failed:', message)
      return NextResponse.json({ error: `Meta OAuth error: ${message}` }, { status: 400 })
    }

    // Step 2: resolve the phone number. Trust a client-supplied id
    // (Meta's WA_EMBEDDED_SIGNUP event usually includes one) but fall
    // back to asking the WABA itself when it's missing — a WABA fresh
    // out of Embedded Signup for a new number has exactly one.
    let phoneNumberId = suppliedPhoneNumberId as string | undefined
    if (!phoneNumberId) {
      try {
        const numbers = await getWabaPhoneNumbers({ wabaId, accessToken })
        phoneNumberId = numbers[0]?.id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Meta API error'
        return NextResponse.json(
          { error: `Could not resolve a phone number for this WhatsApp Business Account: ${message}` },
          { status: 400 },
        )
      }
    }
    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'No phone number found on this WhatsApp Business Account.' },
        { status: 400 },
      )
    }

    // Reject if another account already claimed this number — same
    // single-tenant-per-number safety net as the manual save route
    // (see its comment referencing issue #136).
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: claimed, error: claimedError } = await admin
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phoneNumberId)
      .neq('account_id', accountId)
      .maybeSingle()
    if (claimedError) {
      console.error('[embedded-signup] ownership check failed:', claimedError)
      return NextResponse.json({ error: 'Failed to validate configuration' }, { status: 500 })
    }
    if (claimed) {
      return NextResponse.json(
        {
          error:
            'This WhatsApp phone number is already linked to another account on this instance.',
        },
        { status: 409 },
      )
    }

    // Step 3: verify the number resolves and grab its display info for the response.
    let phoneInfo
    try {
      phoneInfo = await verifyPhoneNumber({ phoneNumberId, accessToken })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }

    // Step 4: register for inbound webhooks. The PIN only matters for
    // this one call — Embedded Signup customers already completed OTP
    // verification inside Meta's popup, there's no PIN field in this
    // app's UI for this path.
    const pin = String(Math.floor(100000 + Math.random() * 900000))
    let registeredAt: string | null = null
    let registrationError: string | null = null
    try {
      await registerPhoneNumber({ phoneNumberId, accessToken, pin })
      registeredAt = new Date().toISOString()
    } catch (err) {
      registrationError = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[embedded-signup] /register failed:', registrationError)
      // Fall through and still save — same "save what we have, surface
      // the error, let them retry" behavior as the manual route.
    }

    // Step 5: subscribe the WABA to this app (idempotent on Meta's side).
    let subscribedAppsAt: string | null = null
    try {
      await subscribeWabaToApp({ wabaId, accessToken })
      subscribedAppsAt = new Date().toISOString()
    } catch (err) {
      console.warn('[embedded-signup] subscribed_apps failed (non-fatal):', err)
    }

    const row = {
      account_id: accountId,
      user_id: user.id,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      access_token: encrypt(accessToken),
      verify_token: null,
      status: registrationError ? 'disconnected' : 'connected',
      connected_at: registrationError ? null : new Date().toISOString(),
      registered_at: registeredAt,
      subscribed_apps_at: subscribedAppsAt,
      last_registration_error: registrationError,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const { error: saveError } = existing
      ? await supabase.from('whatsapp_config').update(row).eq('account_id', accountId)
      : await supabase.from('whatsapp_config').insert(row)

    if (saveError) {
      console.error('[embedded-signup] save failed:', saveError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    if (registrationError) {
      return NextResponse.json({
        success: false,
        saved: true,
        registered: false,
        registration_error: registrationError,
        phone_info: phoneInfo,
      })
    }

    return NextResponse.json({
      success: true,
      saved: true,
      registered: true,
      phone_info: phoneInfo,
    })
  } catch (error) {
    console.error('[embedded-signup] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
