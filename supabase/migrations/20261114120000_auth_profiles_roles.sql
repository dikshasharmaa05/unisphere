-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2 · Auth, profiles, roles, journal settings
-- Every table has RLS enabled. Functions are SECURITY DEFINER with an empty
-- search_path and fully-qualified names.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Types ───────────────────────────────────────────────────────────────────
create type public.app_role as enum ('reader', 'author', 'reviewer', 'editor', 'admin');
create type public.review_model as enum ('single_blind', 'double_blind');

-- ── ORCID iD validation (format 0000-0000-0000-000X + ISO 7064 mod 11-2) ────
create or replace function public.is_valid_orcid(p_orcid text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text;
  total int := 0;
  remainder int;
  expected text;
begin
  if p_orcid is null then
    return true; -- optional field
  end if;
  if p_orcid !~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$' then
    return false;
  end if;
  digits := replace(p_orcid, '-', '');
  for i in 1..15 loop
    total := (total + substr(digits, i, 1)::int) * 2;
  end loop;
  remainder := total % 11;
  expected := case (12 - remainder) % 11 when 10 then 'X' else ((12 - remainder) % 11)::text end;
  return substr(digits, 16, 1) = expected;
end;
$$;

-- ── Tables ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 200),
  affiliation text check (char_length(affiliation) <= 300),
  orcid       text check (public.is_valid_orcid(orcid)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is
  'One row per auth user. Private: visible to the user, editors and admins only (never to reviewers — double-blind).';

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);
comment on table public.user_roles is
  'Role grants. reader on sign-up (trigger), author on first submission (ensure_author_role), others by admins only.';

create table public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint review_model_value check (
    key <> 'review_model' or value in ('"single_blind"'::jsonb, '"double_blind"'::jsonb)
  )
);
comment on table public.site_settings is
  'Journal-wide settings, publicly readable. Never store secrets here.';

insert into public.site_settings (key, value) values ('review_model', '"double_blind"');

-- ── Role helpers (used by RLS policies and server code) ─────────────────────
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role in ('editor', 'admin')
  );
$$;

-- Current review model; Phase 3 policies on reviews/authors branch on this.
create or replace function public.current_review_model()
returns public.review_model
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (s.value #>> '{}')::public.review_model from public.site_settings s where s.key = 'review_model'),
    'double_blind'::public.review_model
  );
$$;

-- Called by the Phase 3 submission trigger. Not callable by API users.
create or replace function public.ensure_author_role(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_roles (user_id, role) values (p_user, 'author')
  on conflict (user_id, role) do nothing;
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- New auth user → profile + reader role.
-- Only whitelisted, length-limited metadata is copied; roles never come from metadata.
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
  orc   text  := upper(nullif(btrim(meta ->> 'orcid'), ''));
begin
  if not public.is_valid_orcid(orc) then
    orc := null;
  end if;

  insert into public.profiles (id, email, full_name, affiliation, orcid)
  values (new.id, new.email, name, aff, orc)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'reader')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Role-change guard: stamp who granted it, and never remove the last admin.
create or replace function public.guard_user_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.granted_by := coalesce(new.granted_by, (select auth.uid()));
    new.granted_at := now();
    return new;
  end if;

  -- DELETE. When the whole account is being deleted (cascade from auth.users →
  -- profiles), the profile row is already gone: allow its roles to go with it.
  if not exists (select 1 from public.profiles where id = old.user_id) then
    return old;
  end if;
  if old.role = 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the last admin.' using errcode = 'P0001';
  end if;
  if old.role = 'reader' then
    raise exception 'The reader role cannot be removed.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger user_roles_guard_insert
  before insert on public.user_roles
  for each row execute function public.guard_user_roles();

create trigger user_roles_guard_delete
  before delete on public.user_roles
  for each row execute function public.guard_user_roles();

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.site_settings enable row level security;

-- profiles
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: editors read all"
  on public.profiles for select to authenticated
  using ((select public.is_editor()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_roles
create policy "user_roles: read own"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_roles: editors read all"
  on public.user_roles for select to authenticated
  using ((select public.is_editor()));

create policy "user_roles: admins grant"
  on public.user_roles for insert to authenticated
  with check ((select public.is_admin()));

create policy "user_roles: admins revoke"
  on public.user_roles for delete to authenticated
  using ((select public.is_admin()));

-- site_settings
create policy "site_settings: public read"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "site_settings: admins write"
  on public.site_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "site_settings: admins insert"
  on public.site_settings for insert to authenticated
  with check ((select public.is_admin()));

-- ── Privileges (defence in depth on top of RLS) ─────────────────────────────
revoke all on public.profiles, public.user_roles, public.site_settings from anon, authenticated;

grant select on public.profiles to authenticated;
-- Users may only change these columns on their own row (email/id/timestamps are not writable).
grant update (full_name, affiliation, orcid) on public.profiles to authenticated;

grant select, insert, delete on public.user_roles to authenticated;

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

revoke execute on function public.ensure_author_role(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.guard_user_roles() from public, anon, authenticated;
