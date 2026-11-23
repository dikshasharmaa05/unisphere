# CLAUDE.md — Unisphere

Peer-reviewed online research journal. Full plan: `PLAN.md`. Visual references: `design-reference/` (Option A — "Light clinical"; `source/project/*.dc.html` are the exact design sources, PNG/WebP are screenshots).

## Stack
- Next.js 16 App Router, React 19, TypeScript (strict, `noUncheckedIndexedAccess`)
- Tailwind CSS v4 — tokens live in `src/app/globals.css` under `@theme` (there is no tailwind.config file in v4)
- Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr`; Resend for email; zod for validation; Vercel deploy
- Next 16 uses `src/proxy.ts` (formerly `middleware.ts`)

## Commands
```bash
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (next core-web-vitals + typescript)
npm run check       # typecheck + lint
npm run build
node --env-file=.env.local scripts/e2e-auth.mjs        # live auth smoke test (app must be running; creates + deletes a test user)
node --env-file=.env.local scripts/e2e-submission.mjs  # live submission-flow test (uploads, submit, revise, delete; cleans up)
npm run db:test:local                             # migrations + RLS tests on a throwaway local Postgres (see supabase/tests/run-local.sh)
```
In the Claude Code cloud sandbox, Node's fetch needs `NODE_USE_ENV_PROXY=1` (for `next start` and scripts) to reach Supabase.

## Conventions
- Journal identity (name, ISSN, DOI prefix, licence…) only in `src/config/journal.ts`. Feature flags in `src/config/site.ts`.
- Placeholders stay bracketed: `[XXXX-XXXX]`, `10.[XXXXX]`, `[Month Year]`, `[n]`. Never invent real-looking numbers, DOIs or dates.
- Server Components by default; `"use client"` only for interactivity (modals, popovers, forms).
- Mutations: server actions or route handlers, input parsed with zod (`src/lib/validation`), role checked server-side **and** enforced by RLS.
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (`createClient` = user session; `createAdminClient` = service role, server-only, bypasses RLS — use sparingly).
- Authors never update/delete submitted or published content; changes go through `change_requests` and create new `article_versions`.
- Crawler access to full text: verify via reverse DNS + forward-confirm (googlebot.com / google.com), never by user-agent alone.
- Auth: server actions in `lib/auth/actions.ts` return `ActionState`; forms use `useFormAction` (keeps input on error). Guards: `requireUser(next)` / `requireRole(ROLE_GROUPS.x, next)` in every protected page — the proxy (`lib/supabase/proxy.ts`) is only a coarse signed-in gate. `getViewer()` = user + profile + roles, cached per request. Redirect targets go through `safeNext()`.
- Roles: `reader` (trigger on sign-up), `author` (Phase 3 submission trigger calls `public.ensure_author_role`), `reviewer`/`editor`/`admin` granted by admins only (RLS). Never read roles from user metadata.
- Review model: `public.current_review_model()`; double-blind is enforced in RLS/views — reviewers never see author identities, authors never see reviewer identities.
- Submissions: server actions in `lib/submissions/actions.ts`, reads in `lib/submissions/queries.ts`, browser uploads via `lib/storage/upload.ts` (signed upload URL + XHR progress, then `registerFileAction`). Embedding `submission_versions` from `submissions` must name the FK (`submission_versions!submission_versions_submission_id_fkey`) — the tables are linked twice.
- Data model & API: `docs/DATABASE.md`. Change submission/article state only via the RPCs (`submit_submission`, `record_decision`, `publish_submission`, …) — never direct status updates. Select explicit columns (some columns are privilege-restricted). Public author lists: `published_authors(version_id)` (no emails). Storage paths: `submissions/{submission_id}/{version_id}/{file}`.
- Migrations: `supabase/migrations/*.sql`, RLS enabled on every table, SECURITY DEFINER functions with `set search_path = ''`. Add behaviour tests to `supabase/tests/`. Regenerate types after schema changes (`types.gen.ts`).
- Motion: GSAP (+ScrollTrigger, SplitText, ScrambleText) and Lenis smooth scroll, all in `src/components/motion/` with plugin setup in `lib/motion/gsap.ts`. Use the primitives (`SplitReveal`, `Scramble`, `ScrubWords`, `Reveal variant=…`, `TiltCard`, `Magnetic`, `VelocityMarquee`, `HorizontalPin`) rather than ad-hoc animation. Always wrap effects in `gsap.matchMedia()` with `MQ.motion` / `MQ.fine` / `MQ.desktopMotion` so reduced-motion users and touch devices get static content. Never hide content with CSS unless a failsafe reveals it (see `[data-split]` in globals.css). Don't combine CSS animations and GSAP on the same element (CSS animations override inline transforms). Scrollable overlays need `data-lenis-prevent` or live in a `dialog`.
- Pop-ups: use `Modal` (native `<dialog>`), `ConfirmDialog`, `Popover`. Auth uses `useAuthModal()` / `<AuthTrigger>`.
- `cn()` from `lib/cn.ts` for class joining. When a component's base classes set `display`, wrap it to hide/show responsively instead of passing `hidden` (class-order conflicts).
- Accessibility: real buttons/links/labels, `aria-label` on icon-only controls (IconButton requires `label`), 44px touch targets, 4.5:1 contrast, works at 360px with no horizontal scroll.

## Design tokens (Option A)
| Token | Hex | Tailwind |
|---|---|---|
| background | #F3F5F2 | `bg-bg` |
| surface | #FFFFFF | `bg-surface` |
| ink | #141A19 | `text-ink` / `bg-ink` |
| muted text | #56605D | `text-muted` |
| secondary text | #3B4442 | `text-ink-soft` |
| lines | #E3E7E3 | `bg-line` / `border-line` |
| lime accent | #E9F5B8 | `bg-lime` |
| seafoam | #CDEDE4 | `bg-seafoam` |
| aqua | #DDF3F1 | `bg-aqua` |
| teal | #2E9C88 | `bg-teal` |
| deep teal (links) | #0E6E62 | `text-teal-deep` |
| soft pink (status) | #F6DDE3 | `bg-pink` |

Fonts: Manrope (`font-sans`, 800 + tight tracking for headlines), JetBrains Mono (`font-mono`, small labels / `eyebrow` utility), Source Serif 4 (`font-serif`, abstract & body).
Shapes: cards 22–40px radius, pill buttons. Signature button = `ButtonLink variant="signature"` (grey pill + lime arrow circle). Secondary = `variant="ink"`. Icon buttons = `IconButton` (44px circles).
