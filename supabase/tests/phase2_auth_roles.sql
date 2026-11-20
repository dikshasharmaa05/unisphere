-- Behaviour tests for 20261114120000_auth_profiles_roles.sql. Run via supabase/tests/run-local.sh.
-- Each "expect" line states the correct outcome; errors marked "expect … error" are the pass condition.
\set ON_ERROR_STOP 0
\echo '--- ORCID (expect t t t f f f t)'
select public.is_valid_orcid('0000-0002-1825-0097'), public.is_valid_orcid('0000-0002-1694-233X'), public.is_valid_orcid('0000-0001-5109-3700'),
       public.is_valid_orcid('0000-0002-1825-0098'), public.is_valid_orcid('0000000218250097'), public.is_valid_orcid('0000-0002-1694-233x'), public.is_valid_orcid(null);

\echo '--- signup trigger: metadata tries to inject role + bad orcid'
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('11111111-1111-1111-1111-111111111111','alice@uni.edu','{"full_name":"Alice A","affiliation":"Uni A","orcid":"0000-0002-1825-0097","role":"admin"}', now()),
 ('22222222-2222-2222-2222-222222222222','bob@uni.edu','{"name":"Bob (Google)","orcid":"1234-5678-9012-3456"}', now()),
 ('33333333-3333-3333-3333-333333333333','eve@uni.edu','{}', now());
select email, full_name, affiliation, orcid from public.profiles order by email;
select p.email, r.role from public.user_roles r join public.profiles p on p.id = r.user_id order by 1,2;

\echo '--- first-admin snippet makes alice admin (expect 1 row), second run makes nothing (0 rows)'
insert into public.user_roles (user_id, role) select u.id, 'admin' from auth.users u where lower(u.email)=lower('ALICE@uni.edu') and u.email_confirmed_at is not null and not exists (select 1 from public.user_roles where role='admin') on conflict (user_id, role) do nothing returning role;
insert into public.user_roles (user_id, role) select u.id, 'admin' from auth.users u where lower(u.email)=lower('eve@uni.edu') and u.email_confirmed_at is not null and not exists (select 1 from public.user_roles where role='admin') on conflict (user_id, role) do nothing returning role;

\echo '=== as EVE (reader)'
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
\echo 'profiles visible (expect only eve):'
select email from public.profiles;
\echo 'roles visible (expect eve reader):'
select role from public.user_roles;
\echo 'self-grant admin (expect RLS error):'
insert into public.user_roles (user_id, role) values ('33333333-3333-3333-3333-333333333333','admin');
\echo 'edit own name/orcid (expect UPDATE 1):'
update public.profiles set full_name='Eve E', orcid='0000-0002-1694-233X' where id='33333333-3333-3333-3333-333333333333';
\echo 'bad orcid (expect check violation):'
update public.profiles set orcid='0000-0002-1694-2330' where id='33333333-3333-3333-3333-333333333333';
\echo 'change own email column (expect permission denied):'
update public.profiles set email='x@y.z' where id='33333333-3333-3333-3333-333333333333';
\echo 'edit someone else (expect UPDATE 0):'
update public.profiles set full_name='hacked' where id='11111111-1111-1111-1111-111111111111';
\echo 'change review model (expect UPDATE 0):'
update public.site_settings set value='"single_blind"' where key='review_model';
\echo 'call ensure_author_role (expect permission denied):'
select public.ensure_author_role('33333333-3333-3333-3333-333333333333');
\echo 'helpers (expect f f double_blind):'
select public.is_admin(), public.is_editor(), public.current_review_model();
reset role;

\echo '=== as ANON'
set role anon; select set_config('request.jwt.claim.sub','', false);
\echo 'profiles (expect permission denied):'
select count(*) from public.profiles;
\echo 'settings (expect review_model):'
select key, value from public.site_settings;
reset role;

\echo '=== as ALICE (admin)'
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
\echo 'profiles visible (expect 3):'
select count(*) from public.profiles;
\echo 'grant bob reviewer (expect INSERT 0 1):'
insert into public.user_roles (user_id, role) values ('22222222-2222-2222-2222-222222222222','reviewer');
select granted_by = '11111111-1111-1111-1111-111111111111' as stamped from public.user_roles where user_id='22222222-2222-2222-2222-222222222222' and role='reviewer';
\echo 'remove own (last) admin (expect Cannot remove the last admin):'
delete from public.user_roles where user_id='11111111-1111-1111-1111-111111111111' and role='admin';
\echo 'remove reader (expect error):'
delete from public.user_roles where user_id='22222222-2222-2222-2222-222222222222' and role='reader';
\echo 'set single blind (expect UPDATE 1):'
update public.site_settings set value='"single_blind"' where key='review_model';
\echo 'invalid model (expect check violation):'
update public.site_settings set value='"open"' where key='review_model';
select public.current_review_model();
reset role;

\echo '=== as BOB (reviewer) — double-blind: must not see other profiles'
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
\echo 'profiles visible (expect only bob):'
select email from public.profiles;
reset role;

\echo '=== ensure_author_role as server (postgres)'
select public.ensure_author_role('33333333-3333-3333-3333-333333333333'); select public.ensure_author_role('33333333-3333-3333-3333-333333333333');
select role from public.user_roles where user_id='33333333-3333-3333-3333-333333333333' order by 1;
\echo '=== email sync'
update auth.users set email='eve2@uni.edu' where id='33333333-3333-3333-3333-333333333333'; select email from public.profiles where id='33333333-3333-3333-3333-333333333333';
\echo '=== cascade delete'
delete from auth.users where id='22222222-2222-2222-2222-222222222222'; select count(*) as bob_rows from public.user_roles where user_id='22222222-2222-2222-2222-222222222222';
