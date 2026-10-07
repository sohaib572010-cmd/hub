import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

let client: SupabaseClient | undefined;

/**
 * Service-role client. Bypasses RLS, so it must only ever run on the server
 * and only after the caller has been authorized (see requireAdmin) or for
 * strictly-filtered public reads.
 */
export function db(): SupabaseClient {
  client ??= createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-application-name': 'hub' } },
  });
  return client;
}
