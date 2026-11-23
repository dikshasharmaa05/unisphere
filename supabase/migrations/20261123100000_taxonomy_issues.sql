-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 · 1/4 — Taxonomy (disciplines, keywords), archive (volumes, issues),
-- upload limits. Public read; editors write.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists unaccent with schema extensions;

create type public.article_type as enum ('original_research', 'review_article', 'case_study', 'short_communication');

-- URL-safe slug: "Mémoire & Sleep" → "memoire-sleep"
create or replace function public.slugify(p text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create table public.disciplines (
  id         smallint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null unique check (char_length(name) between 2 and 80),
  tone       text not null default 'stone' check (tone in ('seafoam', 'lime', 'aqua', 'pink', 'stone')),
  sort       smallint not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.keywords (
  id         bigint generated always as identity primary key,
  label      text not null check (char_length(label) between 1 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.volumes (
  id         smallint generated always as identity primary key,
  number     smallint not null unique check (number > 0),
  year       smallint check (year between 1900 and 2200),
  created_at timestamptz not null default now()
);

create table public.issues (
  id           integer generated always as identity primary key,
  volume_id    smallint not null references public.volumes (id) on delete restrict,
  number       smallint not null check (number > 0),
  label        text check (char_length(label) <= 80),          -- e.g. "[Month Year]"
  published_at timestamptz,                                    -- null = not yet public
  is_current   boolean not null default false,
  cover_path   text,                                           -- public-assets bucket
  created_at   timestamptz not null default now(),
  unique (volume_id, number)
);
create unique index issues_single_current on public.issues (is_current) where is_current;
create index issues_volume_idx on public.issues (volume_id);

-- Seed: the eight disciplines shown on the landing page (editable from the admin panel).
insert into public.disciplines (slug, name, tone, sort) values
  ('life-sciences', 'Life Sciences', 'seafoam', 1),
  ('ai-computing', 'AI & Computing', 'lime', 2),
  ('climate-earth', 'Climate & Earth', 'aqua', 3),
  ('medicine-health', 'Medicine & Health', 'pink', 4),
  ('engineering', 'Engineering', 'stone', 5),
  ('social-sciences', 'Social Sciences', 'aqua', 6),
  ('economics-business', 'Economics & Business', 'stone', 7),
  ('humanities-education', 'Humanities & Education', 'lime', 8);

-- Upload limits (enforced by a trigger on submission_files and by the app).
insert into public.site_settings (key, value) values ('upload_limits', '{
  "manuscript":    {"maxMb": 20, "types": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]},
  "image":         {"maxMb": 10, "types": ["image/png", "image/jpeg"]},
  "figure":        {"maxMb": 10, "types": ["image/png", "image/jpeg", "image/svg+xml"]},
  "dataset":       {"maxMb": 20, "types": ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]},
  "video_upload":  {"maxMb": 50, "types": ["video/mp4", "video/webm"]},
  "supplementary": {"maxMb": 20, "types": ["application/pdf"]},
  "maxImagesAndFiguresPerVersion": 20
}'::jsonb);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.disciplines enable row level security;
alter table public.keywords enable row level security;
alter table public.volumes enable row level security;
alter table public.issues enable row level security;

create policy "disciplines: public read" on public.disciplines for select to anon, authenticated using (true);
create policy "disciplines: editors write" on public.disciplines for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "keywords: public read" on public.keywords for select to anon, authenticated using (true);
create policy "keywords: editors write" on public.keywords for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "volumes: public read" on public.volumes for select to anon, authenticated using (true);
create policy "volumes: editors write" on public.volumes for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "issues: public read published" on public.issues for select to anon, authenticated
  using (published_at is not null or (select public.is_editor()));
create policy "issues: editors write" on public.issues for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

revoke all on public.disciplines, public.keywords, public.volumes, public.issues from anon, authenticated;
grant select on public.disciplines, public.keywords, public.volumes, public.issues to anon, authenticated;
grant insert, update, delete on public.disciplines, public.keywords, public.volumes, public.issues to authenticated;
