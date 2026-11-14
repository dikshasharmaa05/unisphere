import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user (cookie session) — RLS applies.
 */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. BYPASSES RLS — use only in trusted server code
 * (e.g. verified-crawler full-text access, admin exports, email jobs).
 * Never import from a Client Component.
 */
export function createAdminClient() {
  const env = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("Supabase admin client is not configured — set SUPABASE_SERVICE_ROLE_KEY.");
  return createPlainClient<Database>(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
