import { z } from "zod";

/**
 * Environment access, validated with zod.
 * `supabaseEnv()` returns null until both public values are set and valid.
 *
 * NOTE: Next.js inlines NEXT_PUBLIC_* values at BUILD time (client and server bundles),
 * so after adding/changing them in Vercel you must redeploy.
 */

/** Trims whitespace and one pair of surrounding quotes (common copy-paste mistakes). */
const clean = (v: string | undefined) => {
  const t = v?.trim();
  if (!t) return undefined;
  return t.replace(/^(['"])(.*)\1$/, "$2").trim() || undefined;
};

// Referenced literally so Next.js can inline them.
const rawUrl = () => clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const rawKey = () =>
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
  // Name used by Supabase's Vercel integration / newer docs.
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const urlSchema = z.url().refine((u) => u.startsWith("https://") || u.startsWith("http://localhost") || u.startsWith("http://127.0.0.1"));
const keySchema = z.string().min(20);

export type SupabasePublicEnv = { url: string; anonKey: string };

export function supabaseEnv(): SupabasePublicEnv | null {
  const url = urlSchema.safeParse(rawUrl());
  const key = keySchema.safeParse(rawKey());
  if (!url.success || !key.success) return null;
  return { url: url.data.replace(/\/+$/, ""), anonKey: key.data };
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;

/**
 * Which public Supabase variables are missing or malformed — names only, never values.
 * Used by /api/health to make deployment mistakes obvious.
 */
export function supabaseEnvProblems(): { missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  const url = rawUrl();
  const key = rawKey();
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  else if (!urlSchema.safeParse(url).success) invalid.push("NEXT_PUBLIC_SUPABASE_URL (must be https://<ref>.supabase.co)");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  else if (!keySchema.safeParse(key).success) invalid.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (too short — paste the full sb_publishable_ key)");
  return { missing, invalid };
}

export function siteUrl(): string {
  const raw =
    clean(process.env.NEXT_PUBLIC_SITE_URL) ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}
