import type { AuthError } from "@supabase/supabase-js";

/** Turns Supabase Auth errors into messages a researcher can act on. */
export function authErrorMessage(error: Pick<AuthError, "code" | "message" | "status"> | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "That email and password don’t match. Check them, or reset your password.";
    case "email_not_confirmed":
      return "Please verify your email first — we’ve sent you a link. You can resend it below.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters, mixing letters and numbers.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "email_address_invalid":
      return "That email address can’t be used. Please use another.";
    case "over_email_send_rate_limit":
      return "We’ve sent several emails recently. Please wait a few minutes and try again.";
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "signup_disabled":
      return "New registrations are paused right now.";
    case "otp_expired":
      return "That link has expired or was already used. Request a new one.";
    case "provider_disabled":
      return "That sign-in method isn’t available yet.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "Your session has ended. Please sign in again.";
    default:
      if (error?.status === 429) return "Too many attempts. Please wait a minute and try again.";
      return "Something went wrong. Please try again.";
  }
}
