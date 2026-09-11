import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy, shared service-role client for tenant-admin-facing account
// actions that need to call Supabase Admin Auth API (e.g. resetting
// a teammate's password) — mirrors the other per-module
// admin-client.ts files in this repo rather than a shared singleton.
let _adminClient: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _adminClient;
}
