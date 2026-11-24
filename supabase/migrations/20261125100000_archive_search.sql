-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7 · archive & search
--  * search_articles v2: prefix matching ("memo" → memory), several article types,
--    sort by most liked / most discussed, keywords + counters in results, and
--    issue details only for PUBLISHED issues (unpublished issues stay private).
--  * archive_issues(): published volumes/issues with article counts (sidebar).
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.search_articles(text, text, integer, public.article_type, text[], text, integer, integer);

create or replace function public.search_articles(
  p_q          text default null,
  p_discipline text default null,                 -- discipline slug
  p_issue      integer default null,              -- published issues only
  p_types      public.article_type[] default null,
  p_includes   text[] default null,               -- any of: images, figures, video, datasets
  p_sort       text default 'relevance',          -- relevance | newest | oldest | liked | discussed
  p_limit      integer default 20,
  p_offset     integer default 0
)
returns table (
  article_id uuid, slug text, paper_no integer, doi text, title text, abstract text, authors text,
  keywords text[], discipline_slug text, discipline_name text, article_type public.article_type,
  issue_id integer, volume smallint, issue smallint, published_at timestamptz, withdrawn boolean,
  has_images boolean, has_figures boolean, has_video boolean, has_datasets boolean,
  like_count integer, comment_count integer, rank real, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  q       text := left(nullif(btrim(coalesce(p_q, '')), ''), 200);
  tsq     tsquery;
  words   text[];
  is_doi  boolean := q ~* '^(https?://(dx\.)?doi\.org/)?10\.[0-9]{4,9}/';
begin
  if q is not null and not is_doi then
    tsq := websearch_to_tsquery('english', q) || websearch_to_tsquery('simple', q);
    -- Prefix matching for plain queries (no quotes / OR / exclusions): every word as word:*
    if q !~ '["]|(^|\s)-|\sor\s' then
      select array_agg(w) into words
      from (select w from unnest(regexp_split_to_array(lower(q), '[^[:alnum:]]+')) w where w <> '' limit 8) x;
      if words is not null then
        tsq := tsq || to_tsquery('simple', array_to_string(array(select quote_literal(w) || ':*' from unnest(words) w), ' & '));
      end if;
    end if;
  end if;
  return query
  with hits as (
    select a.id, a.slug, a.paper_no, a.doi, a.version_id, a.discipline_id, a.article_type, a.published_at,
           a.withdrawn_at, a.has_images, a.has_figures, a.has_video, a.has_datasets, a.like_count, a.comment_count,
           v.title as v_title, v.abstract as v_abstract,
           i.id as i_id, i.number as i_number, vo.number as vo_number,
           case when tsq is null then 0 else ts_rank_cd(a.search, tsq) end as r
    from public.articles a
    join public.submission_versions v on v.id = a.version_id
    left join public.disciplines d on d.id = a.discipline_id
    left join public.issues i on i.id = a.issue_id and i.published_at is not null
    left join public.volumes vo on vo.id = i.volume_id
    where (q is null
           or (is_doi and lower(a.doi) = lower(regexp_replace(q, '^https?://(dx\.)?doi\.org/', '', 'i')))
           or (not is_doi and a.search @@ tsq))
      and (p_discipline is null or d.slug = p_discipline)
      and (p_issue is null or i.id = p_issue)
      and (p_types is null or cardinality(p_types) = 0 or a.article_type = any(p_types))
      and (p_includes is null or cardinality(p_includes) = 0 or (
            ('images' = any(p_includes) and a.has_images) or ('figures' = any(p_includes) and a.has_figures)
         or ('video' = any(p_includes) and a.has_video) or ('datasets' = any(p_includes) and a.has_datasets)))
  )
  select h.id, h.slug, h.paper_no, h.doi, h.v_title, h.v_abstract,
         (select string_agg(au.full_name, ', ' order by au.position) from public.submission_authors au where au.version_id = h.version_id),
         coalesce((select array_agg(k.label order by vk.position) from public.version_keywords vk
                   join public.keywords k on k.id = vk.keyword_id where vk.version_id = h.version_id), '{}'),
         d.slug, d.name, h.article_type, h.i_id, h.vo_number, h.i_number, h.published_at, h.withdrawn_at is not null,
         h.has_images, h.has_figures, h.has_video, h.has_datasets, h.like_count, h.comment_count,
         h.r::real, count(*) over ()
  from hits h
  left join public.disciplines d on d.id = h.discipline_id
  order by
    case when p_sort = 'relevance' and q is not null then h.r end desc nulls last,
    case when p_sort = 'liked' then h.like_count end desc nulls last,
    case when p_sort = 'discussed' then h.comment_count end desc nulls last,
    case when p_sort = 'oldest' then h.published_at end asc,
    h.published_at desc, h.paper_no desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
comment on function public.search_articles(text, text, integer, public.article_type[], text[], text, integer, integer) is
  'Public archive search: full text (title, DOI, keywords, authors, abstract) with prefix matching, filters, sorting, total count.';
grant execute on function public.search_articles(text, text, integer, public.article_type[], text[], text, integer, integer) to anon, authenticated;

-- Published volumes & issues with how many (published) articles each holds.
create or replace function public.archive_issues()
returns table (issue_id integer, volume smallint, year smallint, issue smallint, label text,
               published_at timestamptz, is_current boolean, article_count bigint)
language sql stable security invoker set search_path = '' as $$
  select i.id, vo.number, vo.year, i.number, i.label, i.published_at, i.is_current,
         (select count(*) from public.articles a where a.issue_id = i.id)
  from public.issues i
  join public.volumes vo on vo.id = i.volume_id
  where i.published_at is not null
  order by vo.number desc, i.number desc;
$$;
grant execute on function public.archive_issues() to anon, authenticated;
