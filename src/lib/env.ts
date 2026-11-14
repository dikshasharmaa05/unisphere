import { z } from "zod";

/**
 * Environment access, validated with zod.
 * Supabase is optional during Phase 1 so the landing page runs without keys;
 * `supabaseEnv()` returns null until both public values are set.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type SupabasePublicEnv = { url: string; anonKey: string };

export function supabaseEnv(): SupabasePublicEnv | null {
  // Referenced literally so Next.js inlines them into the client bundle.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) return null;
  return { url: parsed.data.NEXT_PUBLIC_SUPABASE_URL, anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}
