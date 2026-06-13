/**
 * supabaseClient.ts
 *
 * Exports two Supabase clients:
 *
 *  • `supabaseAdmin`  — uses the SERVICE_ROLE key (bypasses RLS).
 *                       Import this ONLY in server-side code (API routes).
 *                       Never expose to the browser.
 *
 *  • `supabase`       — uses the ANON key (respects RLS).
 *                       Safe to import in client components.
 *
 * Both are singletons to avoid creating multiple connections on
 * hot-module-reload in dev or across Vercel serverless invocations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY || anon; // falls back to anon if not set

// ── Singleton admin client (server-only) ─────────────────────────────────────
let _admin: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(url, svc, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

// ── Public anon client (browser-safe) ────────────────────────────────────────
let _client: SupabaseClient | null = null;
export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(url, anon);
  }
  return _client;
}

// Convenience default export (anon — safe for client components)
export const supabase = getClient();
