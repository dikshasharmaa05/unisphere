# Auth email templates

Branded templates for Supabase Auth emails. Links use `token_hash`, so they work
when the email is opened on a different device or browser than the one used to
sign up (handled by `/auth/confirm` → `src/app/auth/callback/route.ts`).

| File | Supabase template | Subject |
|---|---|---|
| `confirmation.html` | Confirm signup | Confirm your Unisphere account |
| `recovery.html` | Reset password | Reset your Unisphere password |

**Not applied yet.** Supabase's free plan doesn't allow editing templates while using
its built-in mailer. Apply them once custom SMTP (Resend) is configured in the email
phase: Dashboard → Authentication → Emails → Templates, or via the Management API
(`PATCH /v1/projects/{ref}/config/auth` with `mailer_templates_confirmation_content`,
`mailer_templates_recovery_content` and the matching `mailer_subjects_*`).

Until then the default templates work as long as the link is opened in the same
browser that signed up (PKCE `?code=` flow, also handled by the callback route).
