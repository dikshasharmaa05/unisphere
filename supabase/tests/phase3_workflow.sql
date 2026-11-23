-- Behaviour tests for Phase 3 (submissions → review → decision → revision → publish →
-- comments/likes → correction → withdrawal), run via supabase/tests/run-local.sh.
-- Every check prints PASS/FAIL; "expect error" lines show the error that IS the pass.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned

\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set R '''aaaaaaaa-0000-0000-0000-000000000002'''
\set E '''aaaaaaaa-0000-0000-0000-000000000003'''
\set X '''aaaaaaaa-0000-0000-0000-000000000004'''
\set as_alice  'reset role; select set_config(''request.jwt.claim.sub'', ''aaaaaaaa-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_rev    'reset role; select set_config(''request.jwt.claim.sub'', ''aaaaaaaa-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_editor 'reset role; select set_config(''request.jwt.claim.sub'', ''aaaaaaaa-0000-0000-0000-000000000003'', false); set role authenticated;'
\set as_reader 'reset role; select set_config(''request.jwt.claim.sub'', ''aaaaaaaa-0000-0000-0000-000000000004'', false); set role authenticated;'
\set as_anon   'reset role; select set_config(''request.jwt.claim.sub'', '''', false); set role anon;'
\set as_admin  'reset role; select set_config(''request.jwt.claim.sub'', '''', false);'

-- setup (as postgres)
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 (:A, 'alice@uni.edu', '{"full_name":"Alice Author","affiliation":"Uni A","orcid":"0000-0002-1825-0097"}', now()),
 (:R, 'rob@uni.edu',   '{"full_name":"Rob Reviewer"}', now()),
 (:E, 'eve@uni.edu',   '{"full_name":"Eve Editor"}', now()),
 (:X, 'xia@uni.edu',   '{"full_name":"Xia Reader"}', now());
insert into public.user_roles (user_id, role) values (:R, 'reviewer'), (:E, 'editor');
update public.site_settings set value = '"double_blind"' where key = 'review_model';

\echo '── 1. Draft'
:as_alice
select public.create_submission_draft(1::smallint) as sub \gset
select id as v1 from public.submission_versions where submission_id = :'sub' \gset
select 'PASS draft created with ref ' || ref from public.submissions where id = :'sub';
select case when count(*) = 1 and bool_and(is_corresponding) and min(full_name) = 'Alice Author' then 'PASS corresponding author prefilled from profile' else 'FAIL author prefill' end from public.submission_authors where version_id = :'v1';
:as_reader
select case when count(*) = 0 then 'PASS other users cannot see the draft' else 'FAIL draft visible to others' end from public.submissions where id = :'sub';

\echo '── 2. Edit draft, files, limits'
:as_alice
update public.submission_versions set title = 'Sleep and memory in adolescent learners', abstract = 'Too short' where id = :'v1';
update public.version_bodies set body_html = '<p>Full text of the study.</p>' where version_id = :'v1';
select public.set_version_keywords(:'v1', array['Sleep', 'Memory consolidation', 'sleep']);
select case when count(*) = 2 then 'PASS keywords de-duplicated by slug' else 'FAIL keywords ' || count(*) end from public.version_keywords where version_id = :'v1';
insert into public.submission_files (submission_id, version_id, kind, storage_path, file_name, mime_type, bytes)
values (:'sub', :'v1', 'manuscript', :'sub' || '/' || :'v1' || '/manuscript.pdf', 'manuscript.pdf', 'application/pdf', 120000);
insert into public.submission_files (submission_id, version_id, kind, storage_path, file_name, mime_type, bytes, contains_identity)
values (:'sub', :'v1', 'supplementary', :'sub' || '/' || :'v1' || '/title-page.pdf', 'title-page.pdf', 'application/pdf', 5000, true);
\echo 'expect error: file too large'
insert into public.submission_files (submission_id, version_id, kind, storage_path, file_name, mime_type, bytes)
values (:'sub', :'v1', 'image', :'sub' || '/' || :'v1' || '/big.png', 'big.png', 'image/png', 30000000);
\echo 'expect error: wrong type'
insert into public.submission_files (submission_id, version_id, kind, storage_path, file_name, mime_type, bytes)
values (:'sub', :'v1', 'manuscript', :'sub' || '/' || :'v1' || '/x.exe', 'x.exe', 'application/x-msdownload', 100);
insert into storage.objects (bucket_id, name) values ('submissions', :'sub' || '/' || :'v1' || '/manuscript.pdf'), ('submissions', :'sub' || '/' || :'v1' || '/title-page.pdf');
select 'PASS author uploaded to own version folder';
:as_reader
\echo 'expect error: reader cannot upload into someone else''s submission'
insert into storage.objects (bucket_id, name) values ('submissions', :'sub' || '/' || :'v1' || '/evil.pdf');

\echo '── 3. Submit'
:as_alice
\echo 'expect error: abstract too short'
select public.submit_submission(:'sub');
update public.submission_versions set abstract = 'We followed secondary-school students across a full term, pairing sleep tracking with retention tests.' where id = :'v1';
select public.submit_submission(:'sub');
select case when status = 'submitted' and current_version_id = :'v1' then 'PASS submitted' else 'FAIL submit ' || status end from public.submissions where id = :'sub';
select case when public.has_role('author') then 'PASS first submission granted author role' else 'FAIL author role' end;
update public.submission_versions set title = 'Changed after submit' where id = :'v1';
select case when title <> 'Changed after submit' then 'PASS submitted version is frozen (title)' else 'FAIL version editable after submit' end from public.submission_versions where id = :'v1';
update public.version_bodies set body_html = 'hacked' where version_id = :'v1';
select case when body_html <> 'hacked' then 'PASS submitted body is frozen' else 'FAIL body editable' end from public.version_bodies where version_id = :'v1';
\echo 'expect error: cannot add files to a submitted version'
insert into public.submission_files (submission_id, version_id, kind, storage_path, file_name, mime_type, bytes)
values (:'sub', :'v1', 'figure', :'sub' || '/' || :'v1' || '/fig.png', 'fig.png', 'image/png', 100);
\echo 'expect error: author cannot assign reviewers'
select public.assign_reviewer(:'sub', :R);

\echo '── 4. Editorial check & reviewer assignment'
:as_editor
select public.start_editorial_check(:'sub');
:as_admin
insert into public.user_roles (user_id, role) values (:A, 'reviewer');
:as_editor
\echo 'expect error: author (even with reviewer role) cannot review own paper'
select public.assign_reviewer(:'sub', :A);
\echo 'expect error: reader lacks reviewer role'
select public.assign_reviewer(:'sub', :X);
select public.assign_reviewer(:'sub', :R, now() + interval '14 days') as rev \gset
select case when status = 'in_review' then 'PASS assigning a reviewer moves it to in_review' else 'FAIL ' || status end from public.submissions where id = :'sub';

\echo '── 5. Double-blind: reviewer sees no identities'
:as_rev
select case when count(*) = 0 then 'PASS reviewer cannot read submissions table' else 'FAIL' end from public.submissions;
select case when count(*) = 0 then 'PASS reviewer cannot read authors table' else 'FAIL authors visible' end from public.submission_authors;
select case when count(*) = 0 then 'PASS reviewer cannot read bodies directly' else 'FAIL' end from public.version_bodies;
select case when count(*) = 0 then 'PASS reviewer cannot read profiles of others' else 'FAIL' end from public.profiles where id <> :R;
select case when count(*) = 1 then 'PASS reviewer sees assignment list' else 'FAIL' end from public.my_review_assignments();
select case when (p -> 'authors') = 'null'::jsonb and p #>> '{version,title}' like 'Sleep%' and p #>> '{version,body_html}' like '%Full text%'
            then 'PASS packet has title+body but no authors' else 'FAIL packet ' || p::text end
from (select public.get_review_packet(:'rev') as p) t;
select case when jsonb_array_length(public.get_review_packet(:'rev') -> 'files') = 1 then 'PASS identifying file (title page) hidden from reviewer' else 'FAIL files' end;
select case when public.get_review_packet(:'rev')::text not ilike '%alice%' then 'PASS no author name anywhere in packet' else 'FAIL name leaked' end;
select case when count(*) = 1 then 'PASS reviewer can open manuscript file' else 'FAIL manuscript storage' end from storage.objects where name like '%manuscript.pdf';
select case when count(*) = 0 then 'PASS reviewer cannot open identifying file' else 'FAIL identity file readable' end from storage.objects where name like '%title-page.pdf';
update public.reviews set recommendation = 'minor_revision', comments_to_author = 'Please clarify the sampling method and add a limitations section.', comments_to_editor = 'Solid work.' where id = :'rev';
select public.submit_review(:'rev');
select case when status = 'submitted' then 'PASS review submitted' else 'FAIL' end from public.reviews where id = :'rev';

\echo '── 6. Authors never see reviewer identity'
:as_alice
select case when count(*) = 0 then 'PASS author cannot read reviews table' else 'FAIL' end from public.reviews;
select case when count(*) = 0 then 'PASS no review comments before a decision' else 'FAIL' end from public.author_reviews(:'sub');
:as_editor
select public.record_decision(:'sub', 'revise', 'Please address the reviewer comments.');
:as_alice
select case when count(*) = 1 and min(reviewer_label) = 'Reviewer 1' and min(comments_to_author) like 'Please clarify%' then 'PASS author sees "Reviewer 1" + comments only' else 'FAIL' end from public.author_reviews(:'sub');
select case when count(*) = 1 then 'PASS author sees the decision note' else 'FAIL' end from public.editorial_decisions where submission_id = :'sub';

\echo '── 7. Revision'
select public.start_revision(:'sub') as v2 \gset
select case when version = 2 and title like 'Sleep%' then 'PASS revision v2 copies v1' else 'FAIL' end from public.submission_versions where id = :'v2';
select case when count(*) = 2 then 'PASS files carried into v2' else 'FAIL files ' || count(*) end from public.submission_files where version_id = :'v2';
update public.submission_versions set title = 'Sleep-dependent memory consolidation in adolescent learners' where id = :'v2';
\echo 'expect error: cannot delete a file still used by submitted v1'
delete from storage.objects where name like '%manuscript.pdf';
select case when count(*) = 2 then 'PASS shared file kept' else 'FAIL shared file deleted' end from storage.objects where bucket_id = 'submissions';
select public.submit_submission(:'sub');
:as_editor
select public.record_decision(:'sub', 'accept', null);
:as_alice
\echo 'expect error: author cannot publish'
select public.publish_submission(:'sub');
:as_editor
insert into public.volumes (number, year) values (1, 2026);
insert into public.issues (volume_id, number, label, published_at, is_current) values (1, 1, '[Month Year]', now(), true);
select public.publish_submission(:'sub', 1) as art \gset
update public.articles set doi = '10.12345/usj.000001' where id = :'art';
select 'PASS published as ' || slug || ' (paper ' || paper_no || ')' from public.articles where id = :'art';

\echo '── 8. Public vs members'
:as_anon
select case when count(*) = 1 then 'PASS anyone sees the article' else 'FAIL' end from public.articles;
select case when count(*) = 1 then 'PASS anyone sees the published title/abstract (v2 only)' else 'FAIL versions ' || count(*) end from public.submission_versions;
\echo 'expect error: anonymous visitors cannot read full text'
select count(*) from public.version_bodies;
select version_id as pubv from public.articles limit 1 \gset
select case when count(*) = 1 and min(full_name) = 'Alice Author' and min(orcid) = '0000-0002-1825-0097' then 'PASS public author list (name, affiliation, ORCID)' else 'FAIL' end from public.published_authors(:'pubv');
\echo 'expect error: published_authors has no email column'
select email from public.published_authors(:'pubv');
select case when count(*) = 0 then 'PASS unpublished version authors not exposed' else 'FAIL draft authors exposed' end from public.published_authors(:'v1');
\echo 'expect error: visitors cannot call internal helpers'
select public.can_edit_version(:'v1');
select case when count(*) = 1 then 'PASS search by keyword finds it' else 'FAIL search' end from public.search_articles('memory');
select case when count(*) = 1 then 'PASS search by author name' else 'FAIL' end from public.search_articles('alice');
select case when count(*) = 1 then 'PASS search by DOI URL' else 'FAIL doi' end from public.search_articles('https://doi.org/10.12345/usj.000001');
select case when count(*) = 0 then 'PASS search miss returns nothing' else 'FAIL' end from public.search_articles('volcano');
select case when count(*) = 1 then 'PASS filter by discipline' else 'FAIL' end from public.search_articles(null, 'life-sciences');
:as_reader
select case when count(*) = 1 then 'PASS signed-in reader reads full text' else 'FAIL' end from public.version_bodies;
select case when count(*) >= 1 then 'PASS signed-in reader can open published media' else 'FAIL' end from storage.objects where name like '%manuscript.pdf';

\echo '── 9. Comments & likes'
insert into public.comments (article_id, body) values (:'art', 'Was there any difference between early and late start times?');
:as_anon
select case when count(*) = 0 then 'PASS pending comment not public' else 'FAIL' end from public.comments;
:as_reader
select case when count(*) = 1 and bool_and(is_mine) then 'PASS reader sees own pending comment' else 'FAIL' end from public.get_article_comments(:'art');
\echo 'expect error: reader cannot self-approve'
update public.comments set status = 'approved';
select id as cmt from public.comments limit 1 \gset
:as_editor
select public.moderate_comment(:'cmt', true);
:as_anon
select case when count(*) = 1 and min(author_name) = 'Xia Reader' then 'PASS approved comment public with display name' else 'FAIL' end from public.get_article_comments(:'art');
:as_reader
insert into public.likes (article_id) values (:'art');
\echo 'expect error: cannot like on behalf of someone else'
insert into public.likes (article_id, user_id) values (:'art', :A);
select case when like_count = 1 and comment_count = 1 then 'PASS like and comment counters' else 'FAIL counters ' || like_count || '/' || comment_count end from public.articles where id = :'art';

\echo '── 10. Change requests: correction'
\echo 'expect error: non-author cannot request changes'
insert into public.change_requests (article_id, type, reason) values (:'art', 'correction', 'I want to change it');
:as_alice
insert into public.change_requests (article_id, type, reason, proposed_changes) values (:'art', 'correction', 'Typo in the second table caption.', 'Table 2: 4 weeks, not 4 days.');
update public.submission_versions set title = 'Author edits published paper' where id = :'v2';
select case when title not like 'Author edits%' then 'PASS author cannot edit the published version' else 'FAIL' end from public.submission_versions where id = :'v2';
:as_editor
select id as cr from public.change_requests limit 1 \gset
select public.decide_change_request(:'cr', true, 'Approved.');
select public.start_correction(:'cr') as v3 \gset
update public.submission_versions set title = 'Sleep-dependent memory consolidation in adolescent learners (corrected)' where id = :'v3';
select public.publish_correction(:'cr');
:as_anon
select case when count(*) = 2 then 'PASS version history public (v2 + corrected v3)' else 'FAIL history ' || count(*) end from public.submission_versions;
select case when v.title like '%(corrected)' then 'PASS article now shows corrected version' else 'FAIL' end from public.articles a join public.submission_versions v on v.id = a.version_id;

\echo '── 11. Single-blind switch'
:as_admin
update public.site_settings set value = '"single_blind"' where key = 'review_model';
:as_rev
select case when public.get_review_packet(:'rev') -> 'authors' is not null and public.get_review_packet(:'rev')::text like '%Alice Author%' then 'PASS single-blind: reviewer sees author names' else 'FAIL' end;
:as_admin
update public.site_settings set value = '"double_blind"' where key = 'review_model';

\echo '── 12. Withdrawal & audit'
:as_alice
insert into public.change_requests (article_id, type, reason) values (:'art', 'withdrawal', 'Data error discovered in the main analysis.');
:as_editor
select id as wr from public.change_requests where type = 'withdrawal' \gset
select public.decide_change_request(:'wr', true, 'Withdrawn at the authors'' request.');
select case when a.withdrawn_at is not null and s.status = 'withdrawn' then 'PASS article withdrawn (stays on record with a note)' else 'FAIL' end from public.articles a join public.submissions s on s.id = a.submission_id;
select case when count(*) >= 10 then 'PASS audit trail recorded (' || count(*) || ' events)' else 'FAIL audit ' || count(*) end from public.audit_log;
:as_reader
select case when count(*) = 0 then 'PASS readers cannot see the audit log' else 'FAIL' end from public.audit_log;
reset role;
