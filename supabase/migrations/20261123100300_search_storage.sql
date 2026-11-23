-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 · 4/4 — Full-text search and file storage.
-- ─────────────────────────────────────────────────────────────────────────────

-- search_articles: title (A), DOI (A), keywords + authors (B), abstract (C).
-- An exact DOI match short-circuits. Returns only public data.
create or replace function public.search_articles(
  p_q          text default null,
  p_discipline text default null,          -- discipline slug
  p_issue      integer default null,
  p_type       public.article_type default null,
  p_includes   text[] default null,        -- any of: images, figures, video, datasets
  p_sort       text default 'relevance',   -- relevance | newest | oldest
  p_limit      integer default 20,
  p_offset     integer default 0
)
returns table (
  article_id uuid, slug text, paper_no integer, doi text, title text, abstract text, authors text,
  discipline_slug text, discipline_name text, article_type public.article_type,
  volume smallint, issue smallint, published_at timestamptz, withdrawn boolean,
  has_images boolean, has_figures boolean, has_video boolean, has_datasets boolean,
  rank real, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  q       text := nullif(btrim(coalesce(p_q, '')), '');
  tsq     tsquery;
  is_doi  boolean := q ~* '^(https?://(dx\.)?doi\.org/)?10\.[0-9]{4,9}/';
begin
  if q is not null and not is_doi then
    tsq := websearch_to_tsquery('english', q) || websearch_to_tsquery('simple', q);
  end if;
  return query
  with hits as (
    select a.*, v.title as v_title, v.abstract as v_abstract,
           case when tsq is null then 0 else ts_rank_cd(a.search, tsq) end as r
    from public.articles a
    join public.submission_versions v on v.id = a.version_id
    left join public.disciplines d on d.id = a.discipline_id
    where (q is null
           or (is_doi and lower(a.doi) = lower(regexp_replace(q, '^https?://(dx\.)?doi\.org/', '', 'i')))
           or (not is_doi and a.search @@ tsq))
      and (p_discipline is null or d.slug = p_discipline)
      and (p_issue is null or a.issue_id = p_issue)
      and (p_type is null or a.article_type = p_type)
      and (p_includes is null or cardinality(p_includes) = 0 or (
            ('images' = any(p_includes) and a.has_images) or ('figures' = any(p_includes) and a.has_figures)
         or ('video' = any(p_includes) and a.has_video) or ('datasets' = any(p_includes) and a.has_datasets)))
  )
  select h.id, h.slug, h.paper_no, h.doi, h.v_title, h.v_abstract,
         (select string_agg(au.full_name, ', ' order by au.position) from public.submission_authors au where au.version_id = h.version_id),
         d.slug, d.name, h.article_type, vo.number, i.number, h.published_at, h.withdrawn_at is not null,
         h.has_images, h.has_figures, h.has_video, h.has_datasets,
         h.r::real, count(*) over ()
  from hits h
  left join public.disciplines d on d.id = h.discipline_id
  left join public.issues i on i.id = h.issue_id
  left join public.volumes vo on vo.id = i.volume_id
  order by
    case when p_sort = 'relevance' and q is not null then h.r end desc nulls last,
    case when p_sort = 'oldest' then h.published_at end asc,
    h.published_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
grant execute on function public.search_articles(text, text, integer, public.article_type, text[], text, integer, integer) to anon, authenticated;

-- ── Storage buckets ─────────────────────────────────────────────────────────
-- submissions: private manuscripts & media, path {submission_id}/{version_id}/{file}
-- final-pdfs:  private, editor-uploaded typeset PDFs, path {article_id}/{file}.pdf
-- public-assets: public images (issue covers, logos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('submissions', 'submissions', false, 52428800, array[
    'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'image/svg+xml', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'video/mp4', 'video/webm']),
  ('final-pdfs', 'final-pdfs', false, 52428800, array['application/pdf']),
  ('public-assets', 'public-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

-- Path helpers (never throw on malformed paths).
create or replace function public.path_uuid(p_name text, p_part integer)
returns uuid language plpgsql immutable set search_path = '' as $$
declare
  seg text := split_part(p_name, '/', p_part);
begin
  if seg ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return seg::uuid;
  end if;
  return null;
end;
$$;

create or replace function public.can_upload_submission_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submission_versions v
    where v.id = public.path_uuid(p_name, 2)
      and v.submission_id = public.path_uuid(p_name, 1)
      and public.can_edit_version(v.id)
  );
$$;

create or replace function public.can_read_submission_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.is_editor()
    or public.is_submission_owner(public.path_uuid(p_name, 1))
    -- assigned reviewers: files of versions they review, minus identifying files in double-blind
    or exists (
      select 1 from public.submission_files f
      join public.reviews r on r.version_id = f.version_id
      where f.storage_path = p_name and r.reviewer_id = (select auth.uid()) and r.status <> 'withdrawn'
        and not (f.contains_identity and public.current_review_model() = 'double_blind'))
    -- signed-in readers: media of published versions
    or ((select auth.uid()) is not null and exists (
      select 1 from public.submission_files f
      join public.submission_versions v on v.id = f.version_id
      where f.storage_path = p_name and v.published_at is not null));
$$;

-- Owners may delete their own uploads while editable, but never a file that a
-- submitted version still references (revisions share files with earlier versions).
create or replace function public.can_delete_submission_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_upload_submission_object(p_name)
     and not exists (
       select 1 from public.submission_files f
       join public.submission_versions v on v.id = f.version_id
       where f.storage_path = p_name and v.submitted_at is not null);
$$;

create or replace function public.can_read_final_pdf(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_editor()
      or ((select auth.uid()) is not null
          and exists (select 1 from public.articles a where a.final_pdf_path = p_name));
$$;

create policy "submissions bucket: upload to own open version" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.can_upload_submission_object(name));
create policy "submissions bucket: read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and public.can_read_submission_object(name));
create policy "submissions bucket: delete own unsubmitted" on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and public.can_delete_submission_object(name));

create policy "final-pdfs: read published" on storage.objects for select to authenticated
  using (bucket_id = 'final-pdfs' and public.can_read_final_pdf(name));
create policy "final-pdfs: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'final-pdfs' and (select public.is_editor()));
create policy "final-pdfs: editors replace" on storage.objects for update to authenticated
  using (bucket_id = 'final-pdfs' and (select public.is_editor())) with check (bucket_id = 'final-pdfs' and (select public.is_editor()));
create policy "final-pdfs: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'final-pdfs' and (select public.is_editor()));

create policy "public-assets: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and (select public.is_editor()));
create policy "public-assets: editors replace" on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and (select public.is_editor())) with check (bucket_id = 'public-assets' and (select public.is_editor()));
create policy "public-assets: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and (select public.is_editor()));

-- Default licence setting (used when publishing).
insert into public.site_settings (key, value) values ('default_licence', '"CC BY 4.0"') on conflict (key) do nothing;
