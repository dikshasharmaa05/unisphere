import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

/**
 * Lands here after: Google sign-in, and email links (verify email / reset password).
 * Handles both link styles:
 *  - PKCE `?code=` (Supabase's default email template and OAuth)
 *  - `?token_hash=&type=` (recommended template — works when the link opens in another browser)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"), "/account");
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`, url.origin));

  const providerError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  if (providerError) return fail(providerError);

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.code ?? "link_invalid");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(error.code ?? "link_invalid");
  } else {
    return fail("link_invalid");
  }

  const dest = type === "recovery" ? "/account/password" : next;
  const res = NextResponse.redirect(new URL(dest, url.origin));
  res.headers.set("Cache-Control", "no-store");
  return res;
}
