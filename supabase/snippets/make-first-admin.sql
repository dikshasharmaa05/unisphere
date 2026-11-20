-- Make your own account the FIRST admin.
-- Run once in Supabase Dashboard → SQL Editor (runs as the postgres role, bypassing RLS).
-- 1. Sign up in the app and verify your email first.
-- 2. Replace the email below with yours, then run.
-- Safe by design: it does nothing if an admin already exists. After this, grant
-- roles from the admin panel (or as an admin), never with this snippet.

insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where lower(u.email) = lower('you@example.com')   -- ← your email
  and u.email_confirmed_at is not null
  and not exists (select 1 from public.user_roles where role = 'admin')
on conflict (user_id, role) do nothing
returning user_id, role;

-- Expect exactly one row back. Zero rows means: wrong email, email not verified,
-- or an admin already exists.
