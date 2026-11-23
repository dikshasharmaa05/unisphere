# Unisphere — build plan

Online, peer-reviewed, multidisciplinary research journal.
Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) · Resend · Vercel.
Visual source of truth: `design-reference/` (Option A — "Light clinical").

---

## 1. Folder structure

```
src/
  app/
    layout.tsx                 fonts, metadata, globals
    globals.css                Tailwind v4 + design tokens (@theme)
    (public)/                  header + footer + auth pop-up provider
      page.tsx                 landing
      archive/                 archive & search (Volume → Issue, filters)
      articles/[slug]/         article page (abstract public, full text gated)
      submit/                  4-step submission wizard (auth required)
      account/                 my submissions, change requests, profile
      guidelines/, about/[page]/
    (admin)/admin/             editorial desk (editor/admin only)
      submissions/  change-requests/  comments/  issues/
      users/  taxonomy/  settings/
    api/
      articles/[id]/pdf/       PDF download (members + verified crawlers)
      articles/[id]/crossref/  Crossref deposit XML (editor export)
      auth/callback/           OAuth (Google, ORCID) code exchange
    sitemap.ts  robots.ts
  components/
    ui/          Button, IconButton, Card, Pill/Chip, Modal, ConfirmDialog, Popover, Input…
    layout/      SiteHeader, SiteFooter, AdminShell
    landing/     Hero, Globe, LatestResearch, Disciplines, ArchivePreview, Guidelines, Indexing, JoinCta
    article/     CitePopover, AbstractPreview, GatedBody, MediaGallery, VideoEmbed, Discussion
    auth/        AuthModal (sign in / register pop-up)
    ads/         AdSlot (renders nothing until enabled)
  config/
    journal.ts   name, ISSN, DOI prefix, licence… (single place to change)
    site.ts      feature flags
  lib/
    supabase/    client.ts, server.ts (+ service-role admin client), proxy.ts, types.ts
    auth/        getSession, requireRole
    citations/   apa.ts, mla.ts, bibtex.ts
    crossref/    deposit XML generator
    crawlers/    verified-bot check (reverse + forward DNS)
    pdf/         fallback PDF generator
    email/       Resend client + templates
    validation/  zod schemas shared by forms and server actions
  proxy.ts       Next 16 proxy (formerly middleware): Supabase session refresh
supabase/
  migrations/    SQL: schema, RLS, functions, triggers, search
  seed.sql       disciplines, demo data (clearly fake)
```

## 2. Database schema (Postgres / Supabase)

Enums
- `app_role`: `reader | author | reviewer | editor | admin`
- `submission_status`: `draft | submitted | editorial_check | in_review | revision_requested | accepted | declined | published | withdrawn`
- `review_recommendation`: `accept | minor_revision | major_revision | reject`
- `change_request_type`: `correction | withdrawal`; `request_status`: `pending | approved | rejected`
- `comment_status`: `pending | approved | rejected`
- `media_kind`: `image | figure | dataset | video_upload | video_embed | manuscript | final_pdf`

Tables
| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= auth.users.id), `full_name`, `affiliation`, `country`, `orcid`, `email` | Created by trigger on signup. Not publicly listed (no author pages). |
| `user_roles` | `user_id`, `role` | Many roles per user. Everyone gets `reader`; `author` on first submission. Only admins assign editor/reviewer/admin. |
| `disciplines` | `id`, `slug`, `name`, `tone`, `sort` | Categories. |
| `keywords` | `id`, `slug`, `label` | Tags. |
| `volumes` | `id`, `number`, `year` | |
| `issues` | `id`, `volume_id`, `number`, `label` (“[Month Year]”), `published_at`, `is_current` | Archive = Volume → Issue. |
| `submissions` | `id`, `ref` (SUB-0241), `submitter_id`, `status`, `discipline_id`, `article_type`, `created_at`, `submitted_at` | Workflow record; one per manuscript. |
| `article_versions` | `id`, `submission_id`, `version`, `title`, `abstract`, `body_html`, `references`, `created_by`, `created_at`, `reason` | **Immutable version history.** Authors never UPDATE; corrections create new versions via approved change requests. |
| `articles` | `id`, `submission_id`, `current_version_id`, `slug`, `paper_no`, `doi`, `issue_id`, `first_page`, `last_page`, `licence`, `published_at`, `featured`, `search` (tsvector) | Exists only once published. Public row. |
| `article_authors` | `article_version_id`, `position`, `full_name`, `affiliation`, `orcid`, `email` (private), `is_corresponding` | Per-version author list (shown on article, no profile pages). |
| `article_keywords` | `article_version_id`, `keyword_id` | |
| `media` | `id`, `submission_id`, `version_id`, `kind`, `storage_path` or `embed_url`, `caption`, `position`, `bytes` | Storage buckets: `manuscripts` (private), `article-media` (private, signed URLs), `final-pdfs` (private). |
| `reviews` | `id`, `submission_id`, `reviewer_id`, `assigned_by`, `due_at`, `recommendation`, `comments_to_editor`, `comments_to_author`, `submitted_at` | Reviewers see only assigned submissions. |
| `editorial_decisions` | `id`, `submission_id`, `editor_id`, `decision`, `note_to_author`, `created_at` | Audit trail of status changes. |
| `change_requests` | `id`, `article_id`, `requester_id`, `type`, `reason`, `proposed_changes` (jsonb), `status`, `decided_by`, `decided_at`, `resulting_version_id` | Corrections/withdrawals. |
| `comments` | `id`, `article_id`, `author_id`, `body`, `status`, `moderated_by`, `moderated_at`, `parent_id` | Moderated. |
| `likes` | `article_id`, `user_id` (PK both) | |
| `site_settings` | `key`, `value` jsonb | Editable journal settings, ad flag, guidelines content. |
| `audit_log` | `actor_id`, `action`, `entity`, `entity_id`, `data`, `at` | Written by triggers/server actions. |

Helper SQL functions (`security definer`, `stable`): `has_role(role)`, `is_editor()` (editor or admin), `is_assigned_reviewer(submission_id)`, `owns_submission(submission_id)`.

Search: `articles.search` = weighted tsvector (title A, keywords/authors B, abstract C, DOI A) maintained by trigger from the current version; GIN index; `search_articles(q, discipline, issue, type, sort, page)` RPC using `websearch_to_tsquery`. Exact DOI match short-circuits.

## 3. Row-level security (summary)

| Table | SELECT | INSERT | UPDATE / DELETE |
|---|---|---|---|
| `articles` (+ public version columns) | anyone, where published & not withdrawn | — (server/editor only) | editors only |
| full text (`article_versions.body_html`, `media`) | authenticated users for published articles; owner, assigned reviewer, editor for unpublished | owner only while `draft`; editors | owner only while `draft`; never after submit; editors |
| `submissions` | owner, assigned reviewers, editors | authenticated (as self) | owner: only `draft → submitted`; editors: status transitions |
| `reviews` | the reviewer, editors | editors (assignment) | reviewer: own row until submitted; editors |
| `change_requests` | requester, editors | authors of the article | editors only (approve/reject) |
| `comments` | approved → anyone; own pending → author; all → editors | authenticated, forced `status = pending` | editors (moderate); author may delete own pending |
| `likes` | anyone (counts) | authenticated as self | own row delete |
| `profiles` | self, editors | trigger | self (not roles) |
| `user_roles` | self, admins | admins | admins |
| `site_settings`, taxonomy, issues | anyone | admins/editors | admins/editors |

Plus server-side checks in every server action (`requireRole`) — RLS is the backstop, not the only guard.
Verified crawlers get full text through a server-only path using the service-role client after DNS verification (never exposed to browsers).

## 4. Route map

Public: `/` · `/archive` (`?q=&discipline=&volume=&issue=&type=&includes=&sort=&page=`) · `/articles/[slug]` · `/articles/[slug]/pdf` · `/guidelines` · `/about/[page]` · `/sitemap.xml` · `/robots.txt`
Auth: pop-up modal everywhere + `/auth/callback`, `/auth/reset`
Signed-in: `/submit` (+ `/submit/[id]` drafts) · `/account` · `/account/submissions/[id]` (status, change request)
Reviewer: `/review` · `/review/[submissionId]`
Admin (editor/admin): `/admin` → submissions, change-requests, comments, issues, users, taxonomy, settings; Crossref export button per article/issue.

## 5. Phased build order

1. **Phase 1 — scaffold & landing** ✅ (this commit): Next.js + Tailwind tokens, fonts, base UI kit, Supabase client setup, full landing page with placeholder data, responsive nav, auth pop-up UI.
2. **Auth + roles** ✅: email/password with verification, password reset, Google OAuth; profiles + `reader` role via trigger; `getUser`/`getViewer`/`requireUser`/`requireRole`; proxy gate for /submit, /dashboard, /review, /admin, /account; account page; `review_model` setting; health check; live e2e test (`scripts/e2e-auth.mjs`). ORCID sign-in deferred — ORCID iD is a checksum-validated profile field; `lib/auth/providers.ts` is structured so an ORCID OAuth provider can be added.
3. **Database + RLS** ✅: taxonomy & archive, submissions with frozen versions, authors (+ROR, ORCID), files with upload limits, peer review (double-blind enforced via `get_review_packet`), decisions, articles, comments, likes, change requests with version history, audit log, full-text search, storage buckets & policies. 5 migrations applied; 51-check behaviour suite. See `docs/DATABASE.md`.
4. **Submission flow** ✅: 4-step wizard (details with autosave + word count + keywords; authors with pop-up editor, ROR suggestions, ordering, single corresponding author; manuscript & media uploads straight to private Storage with progress bars and limits; review checklist + declarations), dashboard, submission status page (timeline, decisions, anonymous reviewer comments, start revision), revisions as new versions, delete draft. Live e2e: `scripts/e2e-submission.mjs` (26 checks).
5. **Editorial/admin panel**: submissions board + detail (assign reviewers, decision, note to author), reviewer workspace, issues/archive, users & roles, taxonomy, settings.
6. **Article page**: abstract public, gated body (blurred teaser + sign-in card), figures/video, Scholar `citation_*` meta, cite popover (APA/MLA/BibTeX), PDF (editor-uploaded final PDF; generated fallback with journal/vol/issue/DOI/licence/page numbers), verified-crawler full text.
7. **Archive & search**: Postgres FTS, filters, Volume → Issue sidebar, list/grid, pagination, quick abstract preview pop-up.
8. **Comments, likes, share + moderation queue.**
9. **Change requests** (correction/withdrawal) + version history UI.
10. **Emails** (Resend): submission received, status change, reviewer assigned, comment approved. **Also switch Supabase auth emails (verify, reset) from the built-in mailer to Resend custom SMTP** (Dashboard → Authentication → Emails → SMTP Settings) and restyle the templates.
11. **SEO**: sitemap.xml, robots.txt, canonical URLs, Crossref deposit XML generator + admin export.
12. **Testing & deployment**: Vitest (citations, crossref, crawler check), Playwright e2e for key flows, RLS tests, Vercel deploy.

## 6. Decisions

- **Backend**: Supabase (decided). New key format (`sb_publishable_` / `sb_secret_`).
- **ORCID**: no ORCID sign-in for now; optional, checksum-validated ORCID iD on the profile, shown on articles.
- **Auth email**: Supabase built-in mailer in development → Resend custom SMTP in the email phase.
- **Review model**: journal setting `site_settings.review_model` = `single_blind | double_blind`, default **double_blind**.
  Read with `public.current_review_model()`. Enforcement rules for Phase 3 (RLS + server queries, never UI-only):
  - Reviewers can never read `profiles` (already true: profiles are visible only to the owner, editors, admins).
  - In double-blind mode, reviewers read manuscripts through a reviewer-safe view/RPC that omits `article_authors`
    (names, affiliations, ORCID, emails) and any media flagged as containing identities; the base tables stay
    unreadable to reviewers.
  - Authors never see reviewer identities in either mode: authors read reviews only through a view without
    `reviewer_id` / names (comments-to-author only); `reviews` base table is readable by the reviewer and editors only.
  - In single-blind mode the reviewer view additionally exposes author names/affiliations/ORCID.
- **Journal identity**: placeholders stay in `src/config/journal.ts` until real values exist.

## 7. Open questions (later phases)

1. Resend: sending domain and from-address (email phase).
2. Real journal identity values: ISSN, DOI prefix (Crossref membership), publisher name, licence, editorial email.
3. Max video upload size (we suggest ≤ 100 MB, with embeds preferred).
