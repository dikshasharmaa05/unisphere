import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check. Reports only booleans/status words — never data, keys or row counts.
 *  - auth:   Supabase Auth API reachable with the publishable key
 *  - db:     Postgres reachable through the Data API (reads the public journal setting)
 *  - schema: Phase 2 migration present
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, supabase: "not_configured" }, { status: 503 });
  }
  const env = supabaseEnv()!;
  const result = { ok: false, auth: "down", db: "down", schema: "missing" };

  try {
    const r = await fetch(`${env.url}/auth/v1/health`, { headers: { apikey: env.anonKey }, cache: "no-store" });
    result.auth = r.ok ? "ok" : "down";
  } catch {
    result.auth = "down";
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").select("key").eq("key", "review_model").maybeSingle();
    if (!error) {
      result.db = "ok";
      result.schema = "ok";
    } else if (error.code === "42P01" || error.code === "PGRST205") {
      result.db = "ok"; // reachable, table missing
    }
  } catch {
    /* leave as down */
  }

  result.ok = result.auth === "ok" && result.db === "ok" && result.schema === "ok";
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
