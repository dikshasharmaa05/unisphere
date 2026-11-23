-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 · hardening after Supabase security advisor review.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Replace the SECURITY DEFINER view with a function returning the same public
--    fields (never email / user id) for a PUBLISHED version only.
drop view if exists public.published_authors;

create or replace function public.published_authors(p_version uuid)
returns table ("position" smallint, full_name text, affiliation text, affiliation_ror text, orcid text, is_corresponding boolean)
language sql stable security definer set search_path = '' as $$
  select a.position, a.full_name, a.affiliation, a.affiliation_ror, a.orcid, a.is_corresponding
  from public.submission_authors a
  join public.submission_versions v on v.id = a.version_id
  where a.version_id = p_version and v.published_at is not null
  order by a.position;
$$;
comment on function public.published_authors(uuid) is
  'Author names/affiliations/ORCID of a published version. Deliberately excludes email and user_id.';
grant execute on function public.published_authors(uuid) to anon, authenticated;

-- 2. Trigger-only functions must not be callable through the API.
revoke execute on function public.bump_like_count(), public.bump_comment_count(),
  public.assign_version_number(), public.guard_frozen_version(), public.guard_frozen_children(),
  public.validate_submission_file(), public.set_updated_at(), public.handle_new_user(),
  public.handle_user_email_change(), public.guard_user_roles()
  from public, anon, authenticated;

-- 3. Helpers used only in policies for signed-in users: signed-out visitors don't need them.
--    (Helpers used by public-read policies — is_editor, can_read_version, version_is_public —
--    stay executable by anon; they only answer questions about the caller's own access.)
revoke execute on function
  public.has_role(public.app_role), public.is_admin(), public.current_review_model(),
  public.is_submission_owner(uuid), public.submission_is_editable(uuid), public.can_edit_version(uuid),
  public.is_article_author(uuid), public.can_upload_submission_object(text), public.can_read_submission_object(text),
  public.can_delete_submission_object(text), public.can_read_final_pdf(text)
  from public, anon;
grant execute on function
  public.has_role(public.app_role), public.is_admin(), public.current_review_model(),
  public.is_submission_owner(uuid), public.submission_is_editable(uuid), public.can_edit_version(uuid),
  public.is_article_author(uuid), public.can_upload_submission_object(text), public.can_read_submission_object(text),
  public.can_delete_submission_object(text), public.can_read_final_pdf(text)
  to authenticated;
