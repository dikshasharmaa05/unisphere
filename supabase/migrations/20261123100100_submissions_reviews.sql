-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 · 2/4 — Submissions, versions, authors, files, peer review, decisions,
-- audit log.
--
-- Rules enforced here (not just in the UI):
--  • Authors edit only their own drafts / open revisions. A version is FROZEN once
--    submitted (trigger) — later changes create a new version.
--  • Status changes happen only through the SECURITY DEFINER functions below,
--    each of which checks the caller's role and the allowed transition.
--  • Reviewers have NO access to submission tables; they read a review packet via
--    get_review_packet(), which omits author identities in double-blind mode.
--  • Authors never see reviewer identities (author_reviews() returns
--    "Reviewer 1/2…" with comments to the author only).
-- ─────────────────────────────────────────────────────────────────────────────

create type public.submission_status as enum (
  'draft', 'submitted', 'editorial_check', 'in_review', 'revision_requested',
  'accepted', 'declined', 'published', 'withdrawn'
);
create type public.media_kind as enum ('manuscript', 'image', 'figure', 'dataset', 'video_upload', 'video_embed', 'supplementary');
create type public.review_status as enum ('assigned', 'submitted', 'withdrawn');
create type public.review_recommendation as enum ('accept', 'minor_revision', 'major_revision', 'reject');
create type public.decision_type as enum ('accept', 'revise', 'decline');

-- ── Tables ──────────────────────────────────────────────────────────────────
create sequence public.submission_ref_seq;

create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique default ('SUB-' || lpad(nextval('public.submission_ref_seq')::text, 4, '0')),
  submitter_id       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  status             public.submission_status not null default 'draft',
  discipline_id      smallint references public.disciplines (id) on delete restrict,
  article_type       public.article_type not null default 'original_research',
  cover_letter       text check (char_length(cover_letter) <= 5000),   -- editors only
  current_version_id uuid,                                               -- last submitted version
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  submitted_at       timestamptz,                                        -- first submission
  decided_at         timestamptz
);
create index submissions_submitter_idx on public.submissions (submitter_id);
create index submissions_status_idx on public.submissions (status);

create table public.submission_versions (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version       smallint not null default 1 check (version > 0),
  title         text not null default '' check (char_length(title) <= 300),
  abstract      text not null default '' check (char_length(abstract) <= 5000),
  video_url     text check (video_url ~* '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/'),
  reason        text check (char_length(reason) <= 1000),      -- why this version exists (revision / correction)
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  submitted_at  timestamptz,                                   -- frozen from here on
  published_at  timestamptz,                                   -- became the public version
  unique (submission_id, version)
);
create index submission_versions_submission_idx on public.submission_versions (submission_id);
create unique index submission_versions_one_open on public.submission_versions (submission_id) where submitted_at is null;

alter table public.submissions
  add constraint submissions_current_version_fk foreign key (current_version_id)
  references public.submission_versions (id) on delete set null deferrable initially deferred;

-- Full text lives apart from title/abstract so it can be members-only.
create table public.version_bodies (
  version_id      uuid primary key references public.submission_versions (id) on delete cascade,
  body_html       text not null default '' check (char_length(body_html) <= 2000000),
  references_text text check (char_length(references_text) <= 200000),
  updated_at      timestamptz not null default now()
);

create table public.version_keywords (
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  keyword_id bigint not null references public.keywords (id) on delete restrict,
  position   smallint not null default 0,
  primary key (version_id, keyword_id)
);
create index version_keywords_keyword_idx on public.version_keywords (keyword_id);

create table public.submission_authors (
  id               uuid primary key default gen_random_uuid(),
  version_id       uuid not null references public.submission_versions (id) on delete cascade,
  position         smallint not null default 1 check (position > 0),
  full_name        text not null check (char_length(full_name) between 2 and 200),
  affiliation      text check (char_length(affiliation) <= 300),
  affiliation_ror  text check (affiliation_ror ~ '^0[a-z0-9]{6}[0-9]{2}$'),
  orcid            text check (public.is_valid_orcid(orcid)),
  email            text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_corresponding boolean not null default false,
  user_id          uuid references public.profiles (id) on delete set null,
  unique (version_id, position)
);
create index submission_authors_version_idx on public.submission_authors (version_id);
create index submission_authors_user_idx on public.submission_authors (user_id);

create table public.submission_files (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references public.submissions (id) on delete cascade,
  version_id        uuid not null references public.submission_versions (id) on delete cascade,
  kind              public.media_kind not null,
  storage_path      text,                                   -- submissions bucket
  embed_url         text check (embed_url ~* '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/'),
  file_name         text check (char_length(file_name) <= 255),
  mime_type         text check (char_length(mime_type) <= 120),
  bytes             bigint check (bytes >= 0),
  caption           text check (char_length(caption) <= 1000),
  position          smallint not null default 0,
  contains_identity boolean not null default false,         -- e.g. title page: hidden from reviewers in double-blind
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint submission_files_source check (
    (kind = 'video_embed' and embed_url is not null and storage_path is null)
    or (kind <> 'video_embed' and storage_path is not null and embed_url is null)
  )
);
create index submission_files_version_idx on public.submission_files (version_id);
create index submission_files_path_idx on public.submission_files (storage_path);

create table public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  submission_id      uuid not null references public.submissions (id) on delete cascade,
  version_id         uuid not null references public.submission_versions (id) on delete cascade,
  reviewer_id        uuid not null references public.profiles (id) on delete restrict,
  assigned_by        uuid references public.profiles (id) on delete set null,
  assigned_at        timestamptz not null default now(),
  due_at             timestamptz,
  status             public.review_status not null default 'assigned',
  recommendation     public.review_recommendation,
  comments_to_author text check (char_length(comments_to_author) <= 20000),
  comments_to_editor text check (char_length(comments_to_editor) <= 20000),
  submitted_at       timestamptz,
  unique (version_id, reviewer_id)
);
create index reviews_reviewer_idx on public.reviews (reviewer_id);
create index reviews_submission_idx on public.reviews (submission_id);

create table public.editorial_decisions (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  version_id     uuid references public.submission_versions (id) on delete set null,
  editor_id      uuid default auth.uid() references public.profiles (id) on delete set null,
  decision       public.decision_type not null,
  note_to_author text check (char_length(note_to_author) <= 10000),
  created_at     timestamptz not null default now()
);
create index editorial_decisions_submission_idx on public.editorial_decisions (submission_id);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  data       jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ── Internal helpers ────────────────────────────────────────────────────────
create or replace function public.log_event(p_action text, p_entity text, p_entity_id uuid, p_data jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, data)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, p_data);
$$;

-- True when running inside a privileged context (migrations, service role, SECURITY DEFINER functions).
create or replace function public.is_privileged()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

create or replace function public.is_submission_owner(p_submission uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submissions s where s.id = p_submission and s.submitter_id = (select auth.uid()));
$$;

create or replace function public.submission_is_editable(p_submission uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submissions s where s.id = p_submission and s.status in ('draft', 'revision_requested'));
$$;

-- Can the caller change this version's content? Owner: their open draft/revision.
-- Editors: any not-yet-submitted version (e.g. a correction). Never once submitted.
create or replace function public.can_edit_version(p_version uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.submission_versions v
    join public.submissions s on s.id = v.submission_id
    where v.id = p_version
      and v.submitted_at is null
      and (
        (s.submitter_id = (select auth.uid()) and s.status in ('draft', 'revision_requested'))
        or public.is_editor()
      )
  );
$$;

create or replace function public.can_read_version(p_version uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.submission_versions v
    join public.submissions s on s.id = v.submission_id
    where v.id = p_version
      and (s.submitter_id = (select auth.uid()) or public.is_editor())
  );
$$;

create or replace function public.version_is_public(p_version uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submission_versions v where v.id = p_version and v.published_at is not null);
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger submission_versions_set_updated_at before update on public.submission_versions
  for each row execute function public.set_updated_at();
create trigger version_bodies_set_updated_at before update on public.version_bodies
  for each row execute function public.set_updated_at();

-- Version numbers are assigned by the database.
create or replace function public.assign_version_number()
returns trigger language plpgsql set search_path = '' as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
  from public.submission_versions where submission_id = new.submission_id;
  if not public.is_privileged() then
    new.submitted_at := null;
    new.published_at := null;
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger submission_versions_number before insert on public.submission_versions
  for each row execute function public.assign_version_number();

-- Frozen versions: nothing about a submitted version (or its body/authors/keywords/files) changes.
create or replace function public.guard_frozen_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_privileged() then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'submission_versions' then
    if old.submitted_at is not null then
      raise exception 'This version has been submitted and can no longer be changed.' using errcode = 'P0001';
    end if;
    if new.submitted_at is distinct from old.submitted_at or new.published_at is distinct from old.published_at
       or new.submission_id <> old.submission_id or new.version <> old.version then
      raise exception 'Not allowed.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger submission_versions_frozen before update on public.submission_versions
  for each row execute function public.guard_frozen_version();

create or replace function public.guard_frozen_children()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_version uuid := coalesce(new.version_id, old.version_id);
begin
  if public.is_privileged() then
    return coalesce(new, old);
  end if;
  if exists (select 1 from public.submission_versions v where v.id = v_version and v.submitted_at is not null) then
    raise exception 'This version has been submitted and can no longer be changed.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.version_id <> old.version_id then
    raise exception 'Not allowed.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger version_bodies_frozen before insert or update or delete on public.version_bodies
  for each row execute function public.guard_frozen_children();
create trigger version_keywords_frozen before insert or update or delete on public.version_keywords
  for each row execute function public.guard_frozen_children();
create trigger submission_authors_frozen before insert or update or delete on public.submission_authors
  for each row execute function public.guard_frozen_children();
create trigger submission_files_frozen before insert or update or delete on public.submission_files
  for each row execute function public.guard_frozen_children();

-- File rows: kind/size/type limits from site_settings.upload_limits; path must sit
-- under this submission/version; at most N images+figures per version.
create or replace function public.validate_submission_file()
returns trigger language plpgsql set search_path = '' as $$
declare
  limits jsonb := (select value from public.site_settings where key = 'upload_limits');
  rule   jsonb;
  v_sub  uuid;
begin
  select submission_id into v_sub from public.submission_versions where id = new.version_id;
  if v_sub is null or v_sub <> new.submission_id then
    raise exception 'File does not belong to this submission.' using errcode = 'P0001';
  end if;
  if new.kind = 'video_embed' then
    return new;
  end if;
  if new.storage_path not like new.submission_id::text || '/%' then
    raise exception 'File path must start with the submission id.' using errcode = 'P0001';
  end if;
  rule := limits -> new.kind::text;
  if rule is not null then
    if new.bytes is null or new.bytes > (rule ->> 'maxMb')::numeric * 1048576 then
      raise exception 'File is too large for %: the limit is % MB.', new.kind, rule ->> 'maxMb' using errcode = 'P0001';
    end if;
    if new.mime_type is null or not (rule -> 'types') ? new.mime_type then
      raise exception 'File type % is not allowed for %.', coalesce(new.mime_type, 'unknown'), new.kind using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'INSERT' and new.kind in ('image', 'figure')
     and (select count(*) from public.submission_files f where f.version_id = new.version_id and f.kind in ('image', 'figure'))
         >= coalesce((limits ->> 'maxImagesAndFiguresPerVersion')::int, 20) then
    raise exception 'Too many images and figures (limit %).', coalesce(limits ->> 'maxImagesAndFiguresPerVersion', '20') using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger submission_files_validate before insert or update on public.submission_files
  for each row execute function public.validate_submission_file();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.submissions enable row level security;
alter table public.submission_versions enable row level security;
alter table public.version_bodies enable row level security;
alter table public.version_keywords enable row level security;
alter table public.submission_authors enable row level security;
alter table public.submission_files enable row level security;
alter table public.reviews enable row level security;
alter table public.editorial_decisions enable row level security;
alter table public.audit_log enable row level security;

-- submissions (reviewers: no access — they use get_review_packet)
create policy "submissions: owner or editor read" on public.submissions for select to authenticated
  using (submitter_id = (select auth.uid()) or (select public.is_editor()));
create policy "submissions: create own draft" on public.submissions for insert to authenticated
  with check (submitter_id = (select auth.uid()) and status = 'draft');
create policy "submissions: owner edits draft, editors edit" on public.submissions for update to authenticated
  using ((submitter_id = (select auth.uid()) and status = 'draft') or (select public.is_editor()))
  with check ((submitter_id = (select auth.uid()) and status = 'draft') or (select public.is_editor()));
create policy "submissions: owner deletes draft" on public.submissions for delete to authenticated
  using (submitter_id = (select auth.uid()) and status = 'draft');

-- versions: title/abstract of PUBLISHED versions are public; everything else owner/editor
create policy "versions: read" on public.submission_versions for select to anon, authenticated
  using (published_at is not null or public.can_read_version(id));
create policy "versions: create" on public.submission_versions for insert to authenticated
  with check (
    (public.is_submission_owner(submission_id) and public.submission_is_editable(submission_id))
    or (select public.is_editor())
  );
create policy "versions: edit open version" on public.submission_versions for update to authenticated
  using (public.can_edit_version(id)) with check (public.can_edit_version(id));
create policy "versions: discard open revision" on public.submission_versions for delete to authenticated
  using (version > 1 and public.can_edit_version(id));

-- bodies: full text — members only once published
create policy "bodies: read" on public.version_bodies for select to authenticated
  using (public.can_read_version(version_id) or public.version_is_public(version_id));
create policy "bodies: write" on public.version_bodies for insert to authenticated
  with check (public.can_edit_version(version_id));
create policy "bodies: update" on public.version_bodies for update to authenticated
  using (public.can_edit_version(version_id)) with check (public.can_edit_version(version_id));

create policy "version_keywords: read" on public.version_keywords for select to anon, authenticated
  using (public.version_is_public(version_id) or public.can_read_version(version_id));
create policy "version_keywords: write" on public.version_keywords for insert to authenticated
  with check (public.can_edit_version(version_id));
create policy "version_keywords: delete" on public.version_keywords for delete to authenticated
  using (public.can_edit_version(version_id));

-- authors: base table owner/editor only (emails!). Public reads go through published_authors.
create policy "authors: read" on public.submission_authors for select to authenticated
  using (public.can_read_version(version_id));
create policy "authors: insert" on public.submission_authors for insert to authenticated
  with check (public.can_edit_version(version_id));
create policy "authors: update" on public.submission_authors for update to authenticated
  using (public.can_edit_version(version_id)) with check (public.can_edit_version(version_id));
create policy "authors: delete" on public.submission_authors for delete to authenticated
  using (public.can_edit_version(version_id));

-- files: owner/editor; signed-in readers for published versions
create policy "files: read" on public.submission_files for select to authenticated
  using (public.can_read_version(version_id) or public.version_is_public(version_id));
create policy "files: insert" on public.submission_files for insert to authenticated
  with check (public.can_edit_version(version_id));
create policy "files: update" on public.submission_files for update to authenticated
  using (public.can_edit_version(version_id)) with check (public.can_edit_version(version_id));
create policy "files: delete" on public.submission_files for delete to authenticated
  using (public.can_edit_version(version_id));

-- reviews: the reviewer and editors only — never the author
create policy "reviews: reviewer or editor read" on public.reviews for select to authenticated
  using (reviewer_id = (select auth.uid()) or (select public.is_editor()));
create policy "reviews: reviewer drafts own review" on public.reviews for update to authenticated
  using (reviewer_id = (select auth.uid()) and status = 'assigned')
  with check (reviewer_id = (select auth.uid()) and status = 'assigned');

create policy "decisions: editor or submitting author read" on public.editorial_decisions for select to authenticated
  using ((select public.is_editor()) or public.is_submission_owner(submission_id));

create policy "audit: editors read" on public.audit_log for select to authenticated
  using ((select public.is_editor()));

-- ── Privileges ──────────────────────────────────────────────────────────────
revoke all on public.submissions, public.submission_versions, public.version_bodies, public.version_keywords,
  public.submission_authors, public.submission_files, public.reviews, public.editorial_decisions, public.audit_log
  from anon, authenticated;

grant select, delete on public.submissions to authenticated;
grant insert (discipline_id, article_type, cover_letter), update (discipline_id, article_type, cover_letter) on public.submissions to authenticated;
grant usage on sequence public.submission_ref_seq to authenticated;

grant select on public.submission_versions to anon, authenticated;
grant insert (submission_id, title, abstract, video_url, reason), update (title, abstract, video_url, reason), delete
  on public.submission_versions to authenticated;

grant select, insert (version_id, body_html, references_text), update (body_html, references_text) on public.version_bodies to authenticated;
grant select on public.version_keywords to anon, authenticated;
grant insert, delete on public.version_keywords to authenticated;
grant select, insert, update, delete on public.submission_authors to authenticated;
grant select, insert, delete on public.submission_files to authenticated;
grant update (caption, position, contains_identity) on public.submission_files to authenticated;
grant select on public.reviews to authenticated;
grant update (recommendation, comments_to_author, comments_to_editor) on public.reviews to authenticated;
grant select on public.editorial_decisions, public.audit_log to authenticated;

-- ── Workflow functions (each checks the caller) ─────────────────────────────
create or replace function public.create_submission_draft(
  p_discipline_id smallint default null,
  p_article_type public.article_type default 'original_research'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_sub uuid;
  v_ver uuid;
  p     public.profiles;
  v_name text;
begin
  if v_uid is null then raise exception 'Please sign in first.' using errcode = '28000'; end if;
  insert into public.submissions (submitter_id, discipline_id, article_type)
  values (v_uid, p_discipline_id, p_article_type) returning id into v_sub;
  insert into public.submission_versions (submission_id, created_by) values (v_sub, v_uid) returning id into v_ver;
  insert into public.version_bodies (version_id) values (v_ver);
  select * into p from public.profiles where id = v_uid;
  v_name := coalesce(nullif(btrim(p.full_name), ''), 'Author');
  if char_length(v_name) < 2 then v_name := 'Author'; end if;
  insert into public.submission_authors (version_id, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id)
  values (v_ver, 1, v_name, p.affiliation, p.affiliation_ror, p.orcid, p.email, true, v_uid);
  perform public.log_event('submission.created', 'submission', v_sub);
  return v_sub;
end;
$$;

create or replace function public.set_version_keywords(p_version uuid, p_labels text[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_label text;
  v_slug  text;
  v_kw    bigint;
  v_pos   smallint := 0;
begin
  if not public.can_edit_version(p_version) then
    raise exception 'You cannot edit this version.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_labels, 1), 0) > 10 then
    raise exception 'Use at most 10 keywords.' using errcode = 'P0001';
  end if;
  delete from public.version_keywords where version_id = p_version;
  foreach v_label in array coalesce(p_labels, '{}') loop
    v_label := left(btrim(regexp_replace(v_label, '\s+', ' ', 'g')), 60);
    v_slug := public.slugify(v_label);
    continue when v_slug = '';
    insert into public.keywords (label, slug) values (v_label, v_slug) on conflict (slug) do nothing;
    select id into v_kw from public.keywords where slug = v_slug;
    insert into public.version_keywords (version_id, keyword_id, position) values (p_version, v_kw, v_pos)
    on conflict do nothing;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

create or replace function public.submit_submission(p_submission uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  s     public.submissions;
  v     public.submission_versions;
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null or s.submitter_id is distinct from v_uid then
    raise exception 'Submission not found.' using errcode = '42501';
  end if;
  if s.status not in ('draft', 'revision_requested') then
    raise exception 'This submission has already been submitted.' using errcode = 'P0001';
  end if;
  select * into v from public.submission_versions where submission_id = s.id and submitted_at is null;
  if v.id is null then
    raise exception 'There is no open version to submit.' using errcode = 'P0001';
  end if;
  if char_length(btrim(v.title)) < 5 then raise exception 'Add a title (at least 5 characters).' using errcode = 'P0001'; end if;
  if char_length(btrim(v.abstract)) < 50 then raise exception 'Add an abstract (at least 50 characters).' using errcode = 'P0001'; end if;
  if s.discipline_id is null then raise exception 'Choose a discipline.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.submission_authors a where a.version_id = v.id and a.is_corresponding and a.email is not null) then
    raise exception 'Mark a corresponding author with an email address.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.submission_files f where f.version_id = v.id and f.kind = 'manuscript') then
    raise exception 'Upload your manuscript (DOCX or PDF).' using errcode = 'P0001';
  end if;

  update public.submission_versions set submitted_at = now() where id = v.id;
  update public.submissions
     set status = 'submitted', current_version_id = v.id, submitted_at = coalesce(submitted_at, now())
   where id = s.id;
  perform public.ensure_author_role(v_uid);
  perform public.log_event('submission.submitted', 'submission', s.id, jsonb_build_object('version', v.version));
end;
$$;

create or replace function public.start_revision(p_submission uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  s     public.submissions;
  v_old uuid;
  v_new uuid;
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null or s.submitter_id is distinct from v_uid then
    raise exception 'Submission not found.' using errcode = '42501';
  end if;
  if s.status <> 'revision_requested' then
    raise exception 'A revision has not been requested.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.submission_versions where submission_id = s.id and submitted_at is null) then
    raise exception 'A revision is already in progress.' using errcode = 'P0001';
  end if;
  v_old := s.current_version_id;
  insert into public.submission_versions (submission_id, title, abstract, video_url, reason, created_by)
  select submission_id, title, abstract, video_url, 'Revised in response to review', v_uid
  from public.submission_versions where id = v_old
  returning id into v_new;
  insert into public.version_bodies (version_id, body_html, references_text)
  select v_new, body_html, references_text from public.version_bodies where version_id = v_old;
  insert into public.version_keywords (version_id, keyword_id, position)
  select v_new, keyword_id, position from public.version_keywords where version_id = v_old;
  insert into public.submission_authors (version_id, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id)
  select v_new, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id
  from public.submission_authors where version_id = v_old;
  insert into public.submission_files (submission_id, version_id, kind, storage_path, embed_url, file_name, mime_type, bytes, caption, position, contains_identity, created_by)
  select submission_id, v_new, kind, storage_path, embed_url, file_name, mime_type, bytes, caption, position, contains_identity, created_by
  from public.submission_files where version_id = v_old;
  perform public.log_event('submission.revision_started', 'submission', s.id);
  return v_new;
end;
$$;

create or replace function public.start_editorial_check(p_submission uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  update public.submissions set status = 'editorial_check' where id = p_submission and status = 'submitted';
  if not found then raise exception 'Only newly submitted manuscripts can enter the editorial check.' using errcode = 'P0001'; end if;
  perform public.log_event('submission.editorial_check', 'submission', p_submission);
end;
$$;

create or replace function public.assign_reviewer(p_submission uuid, p_reviewer uuid, p_due_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s        public.submissions;
  v_review uuid;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'Submission not found.' using errcode = 'P0001'; end if;
  if s.status not in ('submitted', 'editorial_check', 'in_review') then
    raise exception 'Reviewers can only be assigned while the manuscript is under consideration.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_reviewer and role in ('reviewer', 'editor', 'admin')) then
    raise exception 'That person does not have the reviewer role.' using errcode = 'P0001';
  end if;
  if p_reviewer = s.submitter_id
     or exists (select 1 from public.submission_authors a where a.version_id = s.current_version_id and a.user_id = p_reviewer) then
    raise exception 'Authors cannot review their own manuscript.' using errcode = 'P0001';
  end if;
  insert into public.reviews (submission_id, version_id, reviewer_id, assigned_by, due_at)
  values (s.id, s.current_version_id, p_reviewer, (select auth.uid()), p_due_at)
  on conflict (version_id, reviewer_id) do update
    set status = 'assigned', due_at = excluded.due_at, assigned_at = now(), assigned_by = excluded.assigned_by
    where public.reviews.status = 'withdrawn'
  returning id into v_review;
  if v_review is null then raise exception 'This reviewer is already assigned.' using errcode = 'P0001'; end if;
  update public.submissions set status = 'in_review' where id = s.id and status <> 'in_review';
  perform public.log_event('review.assigned', 'submission', s.id, jsonb_build_object('review', v_review));
  return v_review;
end;
$$;

create or replace function public.withdraw_review(p_review uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  update public.reviews set status = 'withdrawn' where id = p_review and status = 'assigned';
  if not found then raise exception 'Only open review assignments can be withdrawn.' using errcode = 'P0001'; end if;
  perform public.log_event('review.withdrawn', 'review', p_review);
end;
$$;

create or replace function public.submit_review(p_review uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reviews;
begin
  select * into r from public.reviews where id = p_review for update;
  if r.id is null or r.reviewer_id is distinct from (select auth.uid()) then
    raise exception 'Review not found.' using errcode = '42501';
  end if;
  if r.status <> 'assigned' then raise exception 'This review is no longer open.' using errcode = 'P0001'; end if;
  if r.recommendation is null then raise exception 'Choose a recommendation.' using errcode = 'P0001'; end if;
  if char_length(btrim(coalesce(r.comments_to_author, ''))) < 20 then
    raise exception 'Add comments for the author (at least 20 characters).' using errcode = 'P0001';
  end if;
  update public.reviews set status = 'submitted', submitted_at = now() where id = r.id;
  perform public.log_event('review.submitted', 'review', r.id);
end;
$$;

create or replace function public.record_decision(p_submission uuid, p_decision public.decision_type, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.submissions;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'Submission not found.' using errcode = 'P0001'; end if;
  if s.status not in ('submitted', 'editorial_check', 'in_review') then
    raise exception 'A decision can only be recorded while the manuscript is under consideration.' using errcode = 'P0001';
  end if;
  insert into public.editorial_decisions (submission_id, version_id, editor_id, decision, note_to_author)
  values (s.id, s.current_version_id, (select auth.uid()), p_decision, nullif(btrim(p_note), ''));
  update public.submissions
     set status = case p_decision when 'accept' then 'accepted' when 'revise' then 'revision_requested' else 'declined' end::public.submission_status,
         decided_at = now()
   where id = s.id;
  -- Close any open review assignments on this version.
  update public.reviews set status = 'withdrawn' where version_id = s.current_version_id and status = 'assigned';
  perform public.log_event('submission.decision', 'submission', s.id, jsonb_build_object('decision', p_decision));
end;
$$;

-- Reviewer-facing reads (double-blind safe) ───────────────────────────────────
create or replace function public.my_review_assignments()
returns table (
  review_id uuid, submission_ref text, version smallint, title text, discipline text,
  article_type public.article_type, status public.review_status, due_at timestamptz,
  assigned_at timestamptz, submitted_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, s.ref, v.version, v.title, d.name, s.article_type, r.status, r.due_at, r.assigned_at, r.submitted_at
  from public.reviews r
  join public.submissions s on s.id = r.submission_id
  join public.submission_versions v on v.id = r.version_id
  left join public.disciplines d on d.id = s.discipline_id
  where r.reviewer_id = (select auth.uid())
  order by r.assigned_at desc;
$$;

create or replace function public.get_review_packet(p_review uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r      public.reviews;
  blind  boolean := public.current_review_model() = 'double_blind';
  result jsonb;
begin
  select * into r from public.reviews where id = p_review;
  if r.id is null or (r.reviewer_id is distinct from (select auth.uid()) and not public.is_editor()) then
    raise exception 'Review not found.' using errcode = '42501';
  end if;
  if r.status = 'withdrawn' and not public.is_editor() then
    raise exception 'This review assignment was withdrawn.' using errcode = 'P0001';
  end if;
  select jsonb_build_object(
    'review', jsonb_build_object('id', r.id, 'status', r.status, 'due_at', r.due_at, 'recommendation', r.recommendation,
                                 'comments_to_author', r.comments_to_author, 'comments_to_editor', r.comments_to_editor,
                                 'submitted_at', r.submitted_at),
    'review_model', public.current_review_model(),
    'submission', jsonb_build_object('ref', s.ref, 'article_type', s.article_type, 'discipline', d.name),
    'version', jsonb_build_object('number', v.version, 'title', v.title, 'abstract', v.abstract, 'video_url', v.video_url,
                                  'body_html', b.body_html, 'references_text', b.references_text),
    'keywords', coalesce((select jsonb_agg(k.label order by vk.position) from public.version_keywords vk
                          join public.keywords k on k.id = vk.keyword_id where vk.version_id = v.id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'storage_path', f.storage_path,
                                                           'embed_url', f.embed_url, 'file_name', f.file_name,
                                                           'caption', f.caption) order by f.kind, f.position)
                       from public.submission_files f
                       where f.version_id = v.id and not (blind and f.contains_identity)), '[]'::jsonb),
    'authors', case when blind then null else
                 (select jsonb_agg(jsonb_build_object('full_name', a.full_name, 'affiliation', a.affiliation, 'orcid', a.orcid)
                                   order by a.position)
                  from public.submission_authors a where a.version_id = v.id) end
  ) into result
  from public.submission_versions v
  join public.submissions s on s.id = v.submission_id
  left join public.disciplines d on d.id = s.discipline_id
  left join public.version_bodies b on b.version_id = v.id
  where v.id = r.version_id;
  return result;
end;
$$;

-- Author-facing review comments: no reviewer identities, only after a decision.
create or replace function public.author_reviews(p_submission uuid)
returns table (version smallint, reviewer_label text, recommendation public.review_recommendation, comments_to_author text, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.version,
         'Reviewer ' || row_number() over (partition by r.version_id order by r.assigned_at, r.id),
         r.recommendation, r.comments_to_author, r.submitted_at
  from public.reviews r
  join public.submission_versions v on v.id = r.version_id
  where r.submission_id = p_submission
    and r.status = 'submitted'
    and public.is_submission_owner(p_submission)
    and exists (select 1 from public.editorial_decisions d where d.version_id = r.version_id)
  order by v.version, r.assigned_at, r.id;
$$;

-- Function privileges: callable by signed-in users only (each checks the caller).
revoke execute on function
  public.create_submission_draft(smallint, public.article_type), public.set_version_keywords(uuid, text[]),
  public.submit_submission(uuid), public.start_revision(uuid), public.start_editorial_check(uuid),
  public.assign_reviewer(uuid, uuid, timestamptz), public.withdraw_review(uuid), public.submit_review(uuid),
  public.record_decision(uuid, public.decision_type, text), public.my_review_assignments(),
  public.get_review_packet(uuid), public.author_reviews(uuid)
  from public, anon;
grant execute on function
  public.create_submission_draft(smallint, public.article_type), public.set_version_keywords(uuid, text[]),
  public.submit_submission(uuid), public.start_revision(uuid), public.start_editorial_check(uuid),
  public.assign_reviewer(uuid, uuid, timestamptz), public.withdraw_review(uuid), public.submit_review(uuid),
  public.record_decision(uuid, public.decision_type, text), public.my_review_assignments(),
  public.get_review_packet(uuid), public.author_reviews(uuid)
  to authenticated;
revoke execute on function public.log_event(text, text, uuid, jsonb) from public, anon, authenticated;
