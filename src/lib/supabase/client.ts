"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/** Supabase client for Client Components (uses the anon key; RLS applies). */
export function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createBrowserClient<Database>(env.url, env.anonKey);
}
