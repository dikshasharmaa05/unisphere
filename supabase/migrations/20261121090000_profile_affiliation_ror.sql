-- Optional ROR ID (https://ror.org) for the profile's affiliation, chosen from the
-- institution suggestions. Stored as the bare 9-character ID, e.g. 052gg0110.
-- Free-text affiliations without a ROR ID remain valid.

alter table public.profiles
  add column affiliation_ror text
  check (affiliation_ror ~ '^0[a-z0-9]{6}[0-9]{2}$');

comment on column public.profiles.affiliation_ror is
  'ROR ID of the affiliation (bare form, e.g. 052gg0110); null when typed freely.';

grant update (affiliation_ror) on public.profiles to authenticated;

-- Copy the ROR ID from sign-up metadata too (validated; anything else is ignored).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name  text  := left(coalesce(nullif(btrim(meta ->> 'full_name'), ''), nullif(btrim(meta ->> 'name'), ''), ''), 200);
  aff   text  := left(nullif(btrim(meta ->> 'affiliation'), ''), 300);
  ror   text  := lower(nullif(btrim(meta ->> 'affiliation_ror'), ''));
  orc   text  := upper(nullif(btrim(meta ->> 'orcid'), ''));
begin
  if not public.is_valid_orcid(orc) then
    orc := null;
  end if;
  if ror is not null and (ror !~ '^0[a-z0-9]{6}[0-9]{2}$' or aff is null) then
    ror := null;
  end if;

  insert into public.profiles (id, email, full_name, affiliation, affiliation_ror, orcid)
  values (new.id, new.email, name, aff, ror, orc)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'reader')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
