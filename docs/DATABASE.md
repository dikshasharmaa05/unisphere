# Database (Phase 3)

Postgres on Supabase. Every table has row-level security (RLS) on. Status changes go
through `SECURITY DEFINER` functions that check the caller, never through direct `UPDATE`s.
Migrations: `supabase/migrations/`. Behaviour tests: `supabase/tests/` (`npm run db:test:local`).

## Lifecycle

```
draft ──submit_submission──▶ submitted ──start_editorial_check──▶ editorial_check
                                 │                                     │
                                 └──────────── assign_reviewer ────────┴──▶ in_review
                                                                              │
             record_decision: accept ▶ accepted ──publish_submission──▶ published
                              revise ▶ revision_requested ──start_revision → edit → submit_submission
                              decline ▶ declined
published ──change request (withdrawal, approved)──▶ withdrawn (article stays on record with a note)
```

A **version** (`submission_versions`) is frozen once submitted (trigger). Revisions and
corrections create new versions; the public version is `articles.version_id`, and earlier
published versions stay readable as history.

## Tables

| Table | What | Who can read | Who can write |
|---|---|---|---|
| `disciplines`, `keywords`, `volumes`, `issues` | taxonomy & archive | everyone (issues: once published) | editors |
| `submissions` | one per manuscript; status, discipline, type, cover letter | submitting author, editors | author: own draft (discipline/type/cover letter); status via functions |
| `submission_versions` | title, abstract, video link per version | author & editors; **everyone** once published | author: own open version; editors: open correction |
| `version_bodies` | full text + references | author & editors; **signed-in users** once published | same as versions |
| `version_keywords` | keywords per version | like versions | via `set_version_keywords()` |
| `submission_authors` | names, affiliations (+ROR), ORCID, email | author & editors only | author: own open version |
| `submission_files` | manuscript, images, figures, datasets, video, supplementary | author & editors; signed-in users once published | author: own open version (limits enforced) |
| `reviews` | assignments, recommendation, comments | the reviewer, editors — **never the author** | reviewer: own draft review; assignment via functions |
| `editorial_decisions` | accept / revise / decline + note | editors, submitting author | via `record_decision()` |
| `articles` | published record: slug, paper no., received/accepted dates, DOI, issue, pages, licence, PDF, counters, search | everyone | editors (DOI, issue, pages, licence, PDF, featured); creation via `publish_submission()` |
| `comments` | moderated discussion | approved: everyone; own pending: author; all: editors | signed-in users post as *pending*; moderation via `moderate_comment()` |
| `likes` | one per user per article | own only (totals in `articles.like_count`) | own |
| `change_requests` | correction / withdrawal requests | requester, editors | article authors request; editors decide via functions |
| `audit_log` | who did what, when | editors | functions only |
| `profiles`, `user_roles`, `site_settings` | Phase 2 | see Phase 2 | see Phase 2 |

**Author emails are never public.** Use `published_authors(version_id)` for public author lists.

## Functions (API: `supabase.rpc(name, args)`)

| Function | Caller | Does |
|---|---|---|
| `create_submission_draft(discipline_id?, article_type?)` | signed in | new draft + version 1 + corresponding author from profile |
| `set_version_keywords(version_id, labels[])` | author of open version / editor | replace keywords (max 10, de-duplicated) |
| `submit_submission(submission_id)` | submitting author | validates (title, abstract ≥ 50 chars, discipline, corresponding author email, manuscript), freezes version, grants `author` role |
| `start_revision(submission_id)` | submitting author | after "revise": copies last version into an open v(n+1) |
| `start_editorial_check(submission_id)` | editor | submitted → editorial_check |
| `assign_reviewer(submission_id, reviewer_id, due_at?)` | editor | reviewer must have the role and not be an author |
| `withdraw_review(review_id)` | editor | cancel an open assignment |
| `my_review_assignments()` | reviewer | list (no author identities) |
| `get_review_packet(review_id)` | assigned reviewer / editor | title, abstract, body, keywords, files; **authors only in single-blind**; identifying files hidden in double-blind |
| `submit_review(review_id)` | reviewer | requires recommendation + comments to author |
| `record_decision(submission_id, decision, note?)` | editor | accept / revise / decline; closes open reviews |
| `author_reviews(submission_id)` | submitting author | "Reviewer 1/2…" + comments to author, only after a decision |
| `set_version_body(version_id, body_html, references?)` | editor | typeset full text of an **accepted, unpublished** version (published → use a correction) |
| `publish_submission(submission_id, issue_id?, doi?)` | editor | creates the article (paper no., slug, received/accepted dates), makes the version public, indexes search |
| `moderate_comment(comment_id, approve, note?)` | editor | approve / reject |
| `get_article_comments(article_id)` | anyone | approved comments (+ caller's own pending) with display names |
| `decide_change_request(request_id, approve, note?)` | editor | withdrawal approved → article withdrawn |
| `start_correction(request_id)` / `publish_correction(request_id)` | editor | open copy of the public version → edit → publish as new public version |
| `published_authors(version_id)` | anyone | public author list (no emails) |
| `search_articles(q?, discipline?, issue?, type?, includes[]?, sort?, limit?, offset?)` | anyone | full-text search (title, DOI, keywords, authors, abstract) + filters, with total count |

## Review model

`site_settings.review_model` = `double_blind` (default) or `single_blind`; read with
`current_review_model()`. Reviewers have **no** access to submission tables in either mode —
only to `get_review_packet()`, which adds author names in single-blind mode. Authors never
see reviewer identities in either mode.

## Storage

| Bucket | Public | Path | Limit |
|---|---|---|---|
| `submissions` | no | `{submission_id}/{version_id}/{file}` | 50 MB (per-kind limits in `site_settings.upload_limits`) |
| `final-pdfs` | no | `{article_id}/{file}.pdf` | 50 MB; editors upload; signed-in users read published |
| `public-assets` | yes | any | 5 MB; editors upload (issue covers, logos) |

Upload limits (default): manuscript DOCX/PDF 20 MB · images PNG/JPG 10 MB · figures PNG/JPG/SVG 10 MB ·
datasets CSV/XLSX 20 MB · video MP4/WebM 50 MB (YouTube/Vimeo links preferred) · supplementary PDF 20 MB ·
max 20 images + figures per version. Files shared by a revision can't be deleted while an earlier
submitted version uses them.

## Free-plan notes

- Max file size 50 MB, 1 GB total storage — upgrading raises both with no code changes.
- Leaked-password protection (HaveIBeenPwned) needs the Pro plan.
