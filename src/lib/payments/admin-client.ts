import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for the payment-gateway module —
// the public booking route and the three provider webhook routes all
// need to read/write payment_gateway_configs / appointment_deposits
// with no user session. Mirrors src/lib/automations/admin-client.ts.
let _adminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}
