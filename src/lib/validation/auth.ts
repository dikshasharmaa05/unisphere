import { z } from "zod";
import { isValidOrcid, normalizeOrcid } from "./orcid";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.");

/** Optional ORCID: empty → null; otherwise normalised and checksum-validated. */
export const orcidField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = normalizeOrcid(v);
    if (!n || !isValidOrcid(n)) {
      ctx.addIssue({ code: "custom", message: "That ORCID iD isn’t valid. Use the form 0000-0000-0000-000X." });
      return z.NEVER;
    }
    return n;
  });

const fullName = z.string().trim().min(2, "Enter your full name.").max(200, "That name is too long.");
const affiliation = z
  .string()
  .trim()
  .max(300, "That affiliation is too long.")
  .transform((v) => (v === "" ? null : v));

/** Bare ROR ID (e.g. 052gg0110) picked from suggestions; empty → null. */
const affiliationRor = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(/^0[a-z0-9]{6}[0-9]{2}$/, "Invalid ROR ID.").nullable());

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  fullName,
  affiliation,
  affiliationRor: affiliationRor.optional().prefault(""),
  orcid: orcidField,
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don’t match." });

export const profileSchema = z.object({ fullName, affiliation, affiliationRor: affiliationRor.optional().prefault(""), orcid: orcidField });

/** Field errors keyed by input name, for inline messages. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
