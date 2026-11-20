# Auth setup — Supabase dashboard & Google Cloud

Project ref: `fgulzbqyiuolxfzdmdnm` · Supabase URL: `https://fgulzbqyiuolxfzdmdnm.supabase.co`

Replace `YOUR-APP.vercel.app` with your production domain once Vercel gives you one (or your custom domain),
and `YOUR-TEAM` with your Vercel team/account slug (preview URLs look like `unisphere-git-branch-YOUR-TEAM.vercel.app`).

---

## 1. Supabase → Authentication → URL Configuration

| Field | Value |
|---|---|
| **Site URL** | `http://localhost:3000` for now → change to `https://YOUR-APP.vercel.app` when you go live |
| **Redirect URLs** (add each) | `http://localhost:3000/**` |
| | `https://YOUR-APP.vercel.app/**` |
| | `https://*-YOUR-TEAM.vercel.app/**` (Vercel preview deployments) |

The app sends users back to `/auth/callback?next=…`; Supabase only allows destinations on this list
(anything else silently falls back to the Site URL).

## 2. Supabase → Authentication → Sign In / Providers → Email

- **Enable email provider**: on
- **Confirm email**: on (already on — sign-in is refused until the link is clicked)
- **Secure email change**: on
- **Minimum password length**: 8 (the app also enforces 8)

## 3. Supabase → Authentication → Emails → Templates (recommended)

The default templates work when the link is opened in the **same browser** that signed up. To make links work
from any device (e.g. sign up on a laptop, click the email on a phone), change the link in two templates:

**Confirm signup** — replace the `{{ .ConfirmationURL }}` link with:
```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

**Reset password** — replace the `{{ .ConfirmationURL }}` link with:
```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
```

(`RedirectTo` is the app's `/auth/callback?next=…` URL, so it already contains a `?`. This relies on step 1's
Redirect URLs being set.)

**Email sending:** for development we use Supabase's built-in mailer. It is rate-limited (a few emails per hour)
and may only deliver to your project team's addresses — sign up with your own email when testing. In the email
phase we switch auth emails to **Resend via custom SMTP** (Authentication → Emails → SMTP Settings).

## 4. Google sign-in

### 4a. Google Cloud Console (console.cloud.google.com)

1. Create (or pick) a project, e.g. **Unisphere**.
2. **APIs & Services → OAuth consent screen** (called *Google Auth Platform → Branding* in the new UI):
   - User type: **External**
   - App name: `Unisphere` · User support email: yours · Developer contact: yours
   - **Authorized domains**: `supabase.co` and, when you have it, `vercel.app` (or your custom domain)
   - Scopes: keep the defaults (`openid`, `email`, `profile`) — nothing sensitive
   - While in *Testing* status only listed test users can sign in; click **Publish app** when ready
     (no verification is needed for these basic scopes).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application** · Name: `Unisphere (Supabase)`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://YOUR-APP.vercel.app`
   - **Authorized redirect URIs** — exactly one, Supabase's callback (Google never redirects to the app directly):
     - `https://fgulzbqyiuolxfzdmdnm.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.

### 4b. Supabase → Authentication → Sign In / Providers → Google

- Toggle **Enable Sign in with Google**
- Paste **Client ID** and **Client Secret** → Save
- The *Callback URL* shown there must match the redirect URI from 4a step 3.

Flow: app → Google → `https://fgulzbqyiuolxfzdmdnm.supabase.co/auth/v1/callback` → `https://<app>/auth/callback` → signed in.
New Google users get a profile (name from Google) and the `reader` role from the same database trigger.

## 5. Make your account the first admin

1. Sign up in the app with your own email and click the verification link.
2. Supabase → **SQL Editor** → paste `supabase/snippets/make-first-admin.sql`, put your email in it, **Run**.
3. Expect one row back (`admin`). Sign out and in again — the header menu shows **Editorial desk**.

The snippet refuses to run if an admin already exists, and only works for verified emails. Later admins/editors/
reviewers are granted by an admin (admin panel in Phase 5; until then, as an admin, insert into `user_roles`).

## 6. Vercel environment variables (when you deploy)

Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fgulzbqyiuolxfzdmdnm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `sb_publishable_…` key |
| `SUPABASE_SERVICE_ROLE_KEY` | the `sb_secret_…` key — **mark Sensitive**, never prefix with `NEXT_PUBLIC_` |

## 7. Applying migrations

Migrations live in `supabase/migrations/`. Phase 2's migration is already applied to the project.
To apply future ones yourself, either:
- **SQL Editor**: paste each new file's contents in order and run; or
- **Supabase CLI**: `npx supabase link --project-ref fgulzbqyiuolxfzdmdnm` then `npx supabase db push`
  (migration history is recorded, so the CLI knows Phase 2 is applied).
