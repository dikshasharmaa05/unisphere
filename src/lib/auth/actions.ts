"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  forgotPasswordSchema,
  profileSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "@/lib/validation/auth";
import { authErrorMessage } from "./errors";
import { getProvider } from "./providers";
import { safeNext } from "./redirect";
import { getUser } from "./session";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message?: string; fields?: FieldErrors; code?: string; email?: string }
  | { status: "success"; message?: string; email?: string; next?: string };

const form = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));

const callbackUrl = (next: string) => `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

export async function signInAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error), code: error.code, email: parsed.data.email };

  revalidatePath("/", "layout");
  return { status: "success", next: safeNext(fd.get("next"), "") };
}

export async function signUpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  const { email, password, fullName, affiliation, affiliationRor, orcid } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(safeNext(fd.get("next"), "/account")),
      // Copied into public.profiles by the on_auth_user_created trigger (validated there too).
      data: { full_name: fullName, affiliation, affiliation_ror: affiliation ? affiliationRor : null, orcid },
    },
  });
  if (error) return { status: "error", message: authErrorMessage(error), code: error.code };

  // Same response whether or not the email was already registered (no account enumeration).
  return { status: "success", email };
}

export async function resendConfirmationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl("/account") },
  });
  if (error) return { status: "error", message: authErrorMessage(error), code: error.code };
  return { status: "success", email: parsed.data.email, message: "We’ve sent a new verification link." };
}

export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/account/password"),
  });
  // Rate limits are worth surfacing; anything else gets the neutral message (no enumeration).
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { status: "error", message: authErrorMessage(error), code: error.code };
  }
  return {
    status: "success",
    email: parsed.data.email,
    message: "If an account exists for that email, we’ve sent a link to reset your password.",
  };
}

export async function updatePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error), code: error.code };
  return { status: "success", message: "Your password has been updated." };
}

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { status: "error", message: "Your session has ended. Please sign in again." };
  const parsed = profileSchema.safeParse(form(fd));
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      affiliation: parsed.data.affiliation,
      affiliation_ror: parsed.data.affiliation ? parsed.data.affiliationRor : null,
      orcid: parsed.data.orcid,
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23514") return { status: "error", fields: { orcid: "That ORCID iD isn’t valid." } };
    return { status: "error", message: "We couldn’t save your profile. Please try again." };
  }
  // Keep auth metadata roughly in step (used only for display fallbacks).
  await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}

/** Starts an OAuth flow (Google today; ORCID later via its own handler). */
export async function oauthAction(fd: FormData): Promise<void> {
  const provider = getProvider(String(fd.get("provider") ?? ""));
  const next = safeNext(fd.get("next"), "/");
  if (!provider) redirect(`/sign-in?error=provider_disabled&next=${encodeURIComponent(next)}`);
  if (provider.kind === "custom") redirect(`/auth/${provider.id}/start?next=${encodeURIComponent(next)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.id as "google",
    options: { redirectTo: callbackUrl(next) },
  });
  if (error || !data.url) redirect(`/sign-in?error=${encodeURIComponent(error?.code ?? "oauth_failed")}&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
