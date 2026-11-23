-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 6 — article page support.
--  • articles.received_at / accepted_at: public copies of the submission dates
--    (the submissions table itself is not public).
--  • set_version_body(): editors typeset the full text of an ACCEPTED, not yet
--    published version (submitted versions are otherwise frozen). After
--    publication, text changes only via corrections (start_correction).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.articles
  add column received_at timestamptz,
  add column accepted_at timestamptz;

create or replace function public.set_version_body(p_version uuid, p_body_html text, p_references text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.submission_versions;
  s public.submissions;
begin
  if not public.is_editor() then raise exception 'Editors only.' using errcode = '42501'; end if;
  select * into v from public.submission_versions where id = p_version;
  if v.id is null then raise exception 'Version not found.' using errcode = 'P0001'; end if;
  if v.published_at is not null then
    raise exception 'This version is published — use a correction to change it.' using errcode = 'P0001';
  end if;
  select * into s from public.submissions where id = v.submission_id;
  if v.submitted_at is not null and not (s.status = 'accepted' and s.current_version_id = v.id) then
    raise exception 'Full text can be typeset once the manuscript is accepted.' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_body_html, '')) > 2000000 then
    raise exception 'The text is too long.' using errcode = 'P0001';
  end if;
  insert into public.version_bodies (version_id, body_html, references_text)
  values (v.id, coalesce(p_body_html, ''), nullif(btrim(coalesce(p_references, '')), ''))
  on conflict (version_id) do update set body_html = excluded.body_html, references_text = excluded.references_text, updated_at = now();
  perform public.log_event('version.body_set', 'submission', v.submission_id, jsonb_build_object('version', v.version));
end;
$$;
revoke execute on function public.set_version_body(uuid, text, text) from public, anon;
grant execute on function public.set_version_body(uuid, text, text) to authenticated;

-- publish_submission: also copy received/accepted dates onto the public record.
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
  insert into public.articles (submission_id, version_id, slug, paper_no, doi, issue_id, discipline_id, article_type, licence, received_at, accepted_at)
  values (s.id, v.id, v_slug, v_no, nullif(btrim(p_doi), ''), p_issue_id, s.discipline_id, s.article_type,
          coalesce((select value #>> '{}' from public.site_settings where key = 'default_licence'), 'CC BY 4.0'),
          s.submitted_at, s.decided_at)
  returning id into v_id;
  update public.submissions set status = 'published' where id = s.id;
  perform public.refresh_article(v_id);
  perform public.log_event('article.published', 'article', v_id, jsonb_build_object('submission', s.id, 'paper_no', v_no));
  return v_id;
end;
$$;
