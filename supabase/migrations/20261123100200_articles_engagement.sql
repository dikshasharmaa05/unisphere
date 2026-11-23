-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 · 3/4 — Published articles, public author listing, comments (moderated),
-- likes, change requests (correction / withdrawal) with version history.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.comment_status as enum ('pending', 'approved', 'rejected');
create type public.change_request_type as enum ('correction', 'withdrawal');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'completed');

create sequence public.article_paper_no_seq;

create table public.articles (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null unique references public.submissions (id) on delete restrict,
  version_id      uuid not null references public.submission_versions (id) on delete restrict,  -- current public version
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  paper_no        integer not null unique,
  doi             text unique check (doi ~ '^10\.[0-9]{4,9}/\S+$'),
  issue_id        integer references public.issues (id) on delete set null,
  discipline_id   smallint references public.disciplines (id) on delete restrict,
  article_type    public.article_type not null,
  first_page      integer check (first_page > 0),
  last_page       integer check (last_page >= first_page),
  licence         text not null default 'CC BY 4.0' check (char_length(licence) <= 80),
  final_pdf_path  text,                                     -- final-pdfs bucket (editor upload)
  featured        boolean not null default false,
  published_at    timestamptz not null default now(),
  withdrawn_at    timestamptz,
  withdrawal_note text check (char_length(withdrawal_note) <= 5000),
  has_images      boolean not null default false,
  has_figures     boolean not null default false,
  has_video       boolean not null default false,
  has_datasets    boolean not null default false,
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  search          tsvector,
  updated_at      timestamptz not null default now()
);
create index articles_search_idx on public.articles using gin (search);
create index articles_issue_idx on public.articles (issue_id);
create index articles_discipline_idx on public.articles (discipline_id);
create index articles_published_idx on public.articles (published_at desc);
create trigger articles_set_updated_at before update on public.articles for each row execute function public.set_updated_at();

-- Public author listing for published versions — no emails, no user ids.
create view public.published_authors
with (security_invoker = false) as
  select a.version_id, a.position, a.full_name, a.affiliation, a.affiliation_ror, a.orcid, a.is_corresponding
  from public.submission_authors a
  join public.submission_versions v on v.id = a.version_id
  where v.published_at is not null;
comment on view public.published_authors is
  'Author names/affiliations/ORCID for published versions only. Deliberately excludes email and user_id.';

create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.articles (id) on delete cascade,
  author_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id       uuid references public.comments (id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 2 and 5000),
  status          public.comment_status not null default 'pending',
  moderated_by    uuid references public.profiles (id) on delete set null,
  moderated_at    timestamptz,
  moderation_note text check (char_length(moderation_note) <= 1000),
  created_at      timestamptz not null default now()
);
create index comments_article_idx on public.comments (article_id, status);
create index comments_author_idx on public.comments (author_id);

create table public.likes (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create table public.change_requests (
  id                   uuid primary key default gen_random_uuid(),
  article_id           uuid not null references public.articles (id) on delete cascade,
  requester_id         uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  type                 public.change_request_type not null,
  reason               text not null check (char_length(btrim(reason)) between 10 and 5000),
  proposed_changes     text check (char_length(proposed_changes) <= 20000),
  status               public.request_status not null default 'pending',
  decided_by           uuid references public.profiles (id) on delete set null,
  decided_at           timestamptz,
  decision_note        text check (char_length(decision_note) <= 5000),
  resulting_version_id uuid references public.submission_versions (id) on delete set null,
  created_at           timestamptz not null default now()
);
create index change_requests_article_idx on public.change_requests (article_id);
create index change_requests_status_idx on public.change_requests (status);

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- Submitting author or a listed author (linked account) of the article's current version.
create or replace function public.is_article_author(p_article uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.articles ar
    join public.submissions s on s.id = ar.submission_id
    where ar.id = p_article
      and (s.submitter_id = (select auth.uid())
           or exists (select 1 from public.submission_authors a
                      where a.version_id = ar.version_id and a.user_id = (select auth.uid())))
  );
$$;

-- Rebuild search vector + "includes" flags for an article from its current version.
create or replace function public.refresh_article(p_article uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ar public.articles;
begin
  select * into ar from public.articles where id = p_article;
  if ar.id is null then return; end if;
  update public.articles a set
    search =
        setweight(to_tsvector('english', coalesce(v.title, '')), 'A')
     || setweight(to_tsvector('simple', coalesce(ar.doi, '')), 'A')
     || setweight(to_tsvector('simple', coalesce((select string_agg(k.label, ' ') from public.version_keywords vk
                                                   join public.keywords k on k.id = vk.keyword_id where vk.version_id = v.id), '')), 'B')
     || setweight(to_tsvector('simple', coalesce((select string_agg(au.full_name, ' ') from public.submission_authors au
                                                   where au.version_id = v.id), '')), 'B')
     || setweight(to_tsvector('english', coalesce(v.abstract, '')), 'C'),
    has_images   = exists (select 1 from public.submission_files f where f.version_id = v.id and f.kind = 'image'),
    has_figures  = exists (select 1 from public.submission_files f where f.version_id = v.id and f.kind = 'figure'),
    has_datasets = exists (select 1 from public.submission_files f where f.version_id = v.id and f.kind = 'dataset'),
    has_video    = v.video_url is not null
                   or exists (select 1 from public.submission_files f where f.version_id = v.id and f.kind in ('video_upload', 'video_embed'))
  from public.submission_versions v
  where a.id = p_article and v.id = ar.version_id;
end;
$$;

-- Counters
create or replace function public.bump_like_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.articles set like_count = like_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.article_id, old.article_id);
  return null;
end;
$$;
create trigger likes_count after insert or delete on public.likes for each row execute function public.bump_like_count();

create or replace function public.bump_comment_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_ok boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'approved';
  after_ok  boolean := tg_op in ('UPDATE', 'INSERT') and new.status = 'approved';
begin
  if before_ok is distinct from after_ok then
    update public.articles set comment_count = comment_count + case when after_ok then 1 else -1 end
    where id = coalesce(new.article_id, old.article_id);
  end if;
  return null;
end;
$$;
create trigger comments_count after insert or update of status or delete on public.comments
  for each row execute function public.bump_comment_count();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.articles enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.change_requests enable row level security;

create policy "articles: public read" on public.articles for select to anon, authenticated using (true);
create policy "articles: editors update" on public.articles for update to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "comments: approved public; own and editors all" on public.comments for select to anon, authenticated
  using (status = 'approved' or author_id = (select auth.uid()) or (select public.is_editor()));
create policy "comments: post as pending" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending'
              and exists (select 1 from public.articles a where a.id = article_id and a.withdrawn_at is null));
create policy "comments: delete own pending or editors" on public.comments for delete to authenticated
  using ((author_id = (select auth.uid()) and status = 'pending') or (select public.is_editor()));

create policy "likes: own" on public.likes for select to authenticated using (user_id = (select auth.uid()));
create policy "likes: add own" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes: remove own" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "change_requests: requester or editors read" on public.change_requests for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_editor()));
create policy "change_requests: authors request" on public.change_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending' and public.is_article_author(article_id));

revoke all on public.articles, public.comments, public.likes, public.change_requests, public.published_authors from anon, authenticated;
grant select on public.articles, public.published_authors to anon, authenticated;
grant update (doi, issue_id, first_page, last_page, licence, final_pdf_path, featured) on public.articles to authenticated;
grant select on public.comments to anon, authenticated;
grant insert (article_id, parent_id, body), delete on public.comments to authenticated;
grant select, insert (article_id), delete on public.likes to authenticated;
grant select, insert (article_id, type, reason, proposed_changes) on public.change_requests to authenticated;

-- ── Editorial functions ─────────────────────────────────────────────────────
create or replace function public.publish_submission(p_submission uuid, p_issue_id integer default null, p_doi text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s       public.submissions;
  v       public.submission_versions;
  v_no    integer;
  v_slug  text;
  v_id    uuid;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'Submission not found.' using errcode = 'P0001'; end if;
  if s.status <> 'accepted' then raise exception 'Only accepted manuscripts can be published.' using errcode = 'P0001'; end if;
  select * into v from public.submission_versions where id = s.current_version_id;
  v_no := nextval('public.article_paper_no_seq');
  v_slug := left(public.slugify(v.title), 80);
  v_slug := trim(both '-' from v_slug) || '-' || v_no;
  update public.submission_versions set published_at = now() where id = v.id;
  insert into public.articles (submission_id, version_id, slug, paper_no, doi, issue_id, discipline_id, article_type, licence)
  values (s.id, v.id, v_slug, v_no, nullif(btrim(p_doi), ''), p_issue_id, s.discipline_id, s.article_type,
          coalesce((select value #>> '{}' from public.site_settings where key = 'default_licence'), 'CC BY 4.0'))
  returning id into v_id;
  update public.submissions set status = 'published' where id = s.id;
  perform public.refresh_article(v_id);
  perform public.log_event('article.published', 'article', v_id, jsonb_build_object('submission', s.id, 'paper_no', v_no));
  return v_id;
end;
$$;

create or replace function public.moderate_comment(p_comment uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  update public.comments
     set status = case when p_approve then 'approved' else 'rejected' end::public.comment_status,
         moderated_by = (select auth.uid()), moderated_at = now(), moderation_note = nullif(btrim(p_note), '')
   where id = p_comment;
  if not found then raise exception 'Comment not found.' using errcode = 'P0001'; end if;
  perform public.log_event(case when p_approve then 'comment.approved' else 'comment.rejected' end, 'comment', p_comment);
end;
$$;

-- Approved comments (plus the caller's own pending ones) with display names.
create or replace function public.get_article_comments(p_article uuid)
returns table (id uuid, parent_id uuid, body text, status public.comment_status, created_at timestamptz,
               author_name text, is_article_author boolean, is_mine boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.parent_id, c.body, c.status, c.created_at,
         coalesce(nullif(p.full_name, ''), 'Reader'),
         exists (select 1 from public.articles ar join public.submissions s on s.id = ar.submission_id
                 where ar.id = c.article_id
                   and (s.submitter_id = c.author_id
                        or exists (select 1 from public.submission_authors a where a.version_id = ar.version_id and a.user_id = c.author_id))),
         c.author_id = (select auth.uid())
  from public.comments c
  join public.profiles p on p.id = c.author_id
  where c.article_id = p_article
    and (c.status = 'approved' or c.author_id = (select auth.uid()))
  order by c.created_at;
$$;

create or replace function public.decide_change_request(p_request uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  cr public.change_requests;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into cr from public.change_requests where id = p_request for update;
  if cr.id is null or cr.status <> 'pending' then raise exception 'Request not found or already decided.' using errcode = 'P0001'; end if;
  update public.change_requests
     set status = case when not p_approve then 'rejected'
                       when cr.type = 'withdrawal' then 'completed'
                       else 'approved' end::public.request_status,
         decided_by = (select auth.uid()), decided_at = now(), decision_note = nullif(btrim(p_note), '')
   where id = cr.id;
  if p_approve and cr.type = 'withdrawal' then
    update public.articles set withdrawn_at = now(), withdrawal_note = coalesce(nullif(btrim(p_note), ''), cr.reason) where id = cr.article_id;
    update public.submissions set status = 'withdrawn' where id = (select submission_id from public.articles where id = cr.article_id);
  end if;
  perform public.log_event(case when p_approve then 'change_request.approved' else 'change_request.rejected' end,
                           'change_request', cr.id, jsonb_build_object('type', cr.type));
end;
$$;

-- Approved correction → editors get an open copy of the public version to edit…
create or replace function public.start_correction(p_request uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cr    public.change_requests;
  ar    public.articles;
  v_new uuid;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into cr from public.change_requests where id = p_request for update;
  if cr.id is null or cr.type <> 'correction' or cr.status <> 'approved' then
    raise exception 'Only approved correction requests can be started.' using errcode = 'P0001';
  end if;
  if cr.resulting_version_id is not null then return cr.resulting_version_id; end if;
  select * into ar from public.articles where id = cr.article_id;
  insert into public.submission_versions (submission_id, title, abstract, video_url, reason, created_by)
  select submission_id, title, abstract, video_url, 'Correction: ' || left(cr.reason, 900), (select auth.uid())
  from public.submission_versions where id = ar.version_id
  returning id into v_new;
  insert into public.version_bodies (version_id, body_html, references_text)
  select v_new, body_html, references_text from public.version_bodies where version_id = ar.version_id;
  insert into public.version_keywords (version_id, keyword_id, position)
  select v_new, keyword_id, position from public.version_keywords where version_id = ar.version_id;
  insert into public.submission_authors (version_id, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id)
  select v_new, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id
  from public.submission_authors where version_id = ar.version_id;
  insert into public.submission_files (submission_id, version_id, kind, storage_path, embed_url, file_name, mime_type, bytes, caption, position, contains_identity, created_by)
  select submission_id, v_new, kind, storage_path, embed_url, file_name, mime_type, bytes, caption, position, contains_identity, created_by
  from public.submission_files where version_id = ar.version_id;
  update public.change_requests set resulting_version_id = v_new where id = cr.id;
  perform public.log_event('correction.started', 'article', ar.id, jsonb_build_object('version', v_new));
  return v_new;
end;
$$;

-- …and publish it: it becomes the public version; earlier versions stay in history.
create or replace function public.publish_correction(p_request uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  cr public.change_requests;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into cr from public.change_requests where id = p_request for update;
  if cr.id is null or cr.status <> 'approved' or cr.resulting_version_id is null then
    raise exception 'Start the correction first.' using errcode = 'P0001';
  end if;
  update public.submission_versions set submitted_at = now(), published_at = now()
   where id = cr.resulting_version_id and submitted_at is null;
  update public.articles set version_id = cr.resulting_version_id where id = cr.article_id;
  update public.submissions s set current_version_id = cr.resulting_version_id
   from public.articles a where a.id = cr.article_id and s.id = a.submission_id;
  update public.change_requests set status = 'completed' where id = cr.id;
  perform public.refresh_article(cr.article_id);
  perform public.log_event('correction.published', 'article', cr.article_id, jsonb_build_object('version', cr.resulting_version_id));
end;
$$;

revoke execute on function
  public.publish_submission(uuid, integer, text), public.moderate_comment(uuid, boolean, text),
  public.decide_change_request(uuid, boolean, text), public.start_correction(uuid), public.publish_correction(uuid),
  public.refresh_article(uuid)
  from public, anon;
grant execute on function
  public.publish_submission(uuid, integer, text), public.moderate_comment(uuid, boolean, text),
  public.decide_change_request(uuid, boolean, text), public.start_correction(uuid), public.publish_correction(uuid)
  to authenticated;
revoke execute on function public.refresh_article(uuid) from authenticated;
grant execute on function public.get_article_comments(uuid) to anon, authenticated;
