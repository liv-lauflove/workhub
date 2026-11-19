begin;

create schema issue171_test;
create function issue171_test.check_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create function issue171_test.expect_error(statement text, expected_state text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE %', expected_state;
end;
$$;

grant usage on schema issue171_test to authenticated;
grant execute on all functions in schema issue171_test to authenticated;

insert into public.teams (id, name) values
  ('b1710000-0000-4000-8000-000000000001', 'Issue 171 Alpha'),
  ('b1710000-0000-4000-8000-000000000002', 'Issue 171 Beta'),
  ('e3333333-3333-3333-3333-333333333333', 'Management')
on conflict (id) do nothing;

insert into auth.users (id, email) values
  ('a1710000-0000-4000-8000-000000000001', 'lead171@workhub.invalid'),
  ('a1710000-0000-4000-8000-000000000002', 'other171@workhub.invalid'),
  ('a1710000-0000-4000-8000-000000000003', 'manager171@workhub.invalid'),
  ('a1710000-0000-4000-8000-000000000004', 'member171@workhub.invalid');

update public.profiles set role = 'leader', team_id = 'b1710000-0000-4000-8000-000000000001'
where id = 'a1710000-0000-4000-8000-000000000001';
update public.profiles set role = 'leader', team_id = 'b1710000-0000-4000-8000-000000000002'
where id = 'a1710000-0000-4000-8000-000000000002';
update public.profiles set role = 'leader', team_id = 'e3333333-3333-3333-3333-333333333333'
where id = 'a1710000-0000-4000-8000-000000000003';
update public.profiles set role = 'member', team_id = 'e3333333-3333-3333-3333-333333333333'
where id = 'a1710000-0000-4000-8000-000000000004';

select issue171_test.check_true(
  not has_table_privilege('anon', 'public.ai_knowledge_documents', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ai_knowledge_documents', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ai_knowledge_documents', 'UPDATE')
  and not has_function_privilege('anon', 'public.create_ai_knowledge_draft(uuid,text,text)', 'EXECUTE'),
  'Direct writes and anonymous reads are unavailable'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000003', true);
select set_config('issue171.alpha_draft', public.create_ai_knowledge_draft(
  'b1710000-0000-4000-8000-000000000001', 'Panduan Alpha', E'# Panduan Alpha\n\n## Done\n\nQA Alpha.'
)::text, true);
select set_config('issue171.beta_draft', public.create_ai_knowledge_draft(
  'b1710000-0000-4000-8000-000000000002', 'Panduan Beta', E'# Panduan Beta\n\n## Done\n\nQA Beta.'
)::text, true);
select issue171_test.check_true(
  (select uploaded_by = auth.uid() from public.ai_knowledge_documents where id = current_setting('issue171.alpha_draft')::uuid),
  'Uploader identity is taken from the session'
);

select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000001', true);
select issue171_test.check_true(
  not exists (select 1 from public.ai_knowledge_documents where id = current_setting('issue171.alpha_draft')::uuid), 'Team lead cannot read draft'
);
select issue171_test.expect_error(format('select public.set_ai_knowledge_document_state(%L, %L)', current_setting('issue171.alpha_draft'), 'publish'), '42501');
select issue171_test.expect_error($op$select public.create_ai_knowledge_draft('b1710000-0000-4000-8000-000000000001', 'Unauthorized', 'test')$op$, '42501');

select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000004', true);
select issue171_test.expect_error($op$select public.create_ai_knowledge_draft('b1710000-0000-4000-8000-000000000001', 'Unauthorized', 'test')$op$, '42501');

select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000003', true);
select public.set_ai_knowledge_document_state(current_setting('issue171.alpha_draft')::uuid, 'publish');
select public.set_ai_knowledge_document_state(current_setting('issue171.beta_draft')::uuid, 'publish');
reset role;
insert into public.ai_query_cache (user_id, team_id, cache_scope, query_hash, query_text, response_text)
values ('a1710000-0000-4000-8000-000000000001', 'b1710000-0000-4000-8000-000000000001',
  'knowledge:' || current_setting('issue171.alpha_draft'), repeat('a171', 16), 'Issue 171 synthetic SOP', 'Synthetic answer');
set local role authenticated;
select set_config('issue171.invalid_draft', public.create_ai_knowledge_draft(
  'b1710000-0000-4000-8000-000000000001', 'Draf tidak valid', 'Tidak ada heading'
)::text, true);
select issue171_test.expect_error(format('select public.set_ai_knowledge_document_state(%L, %L)', current_setting('issue171.invalid_draft'), 'publish'), '22023');

select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000001', true);
select issue171_test.check_true(
  (select array_agg(id) = array[current_setting('issue171.alpha_draft')::uuid]
  from public.ai_knowledge_documents), 'Alpha lead only sees active Alpha document, even when replacement publication fails'
);
select issue171_test.check_true(exists (
  select 1 from public.ai_query_cache where query_hash = repeat('a171', 16)
), 'Owner can read cache while source is published');
select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000002', true);
select issue171_test.check_true(
  (select array_agg(id) = array[current_setting('issue171.beta_draft')::uuid]
  from public.ai_knowledge_documents), 'Beta lead only sees active Beta document'
);
select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000004', true);
select issue171_test.check_true(not exists (select 1 from public.ai_knowledge_documents), 'Management member has no access in the pilot');

select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000003', true);
select set_config('issue171.new_draft', public.create_ai_knowledge_draft(
  'b1710000-0000-4000-8000-000000000001', 'Panduan pengganti', E'# Panduan Alpha\n\n## Done\n\nAturan pengganti.'
)::text, true);
select public.set_ai_knowledge_document_state(current_setting('issue171.new_draft')::uuid, 'publish');
select issue171_test.check_true(
  (select version = 3 and status = 'published' from public.ai_knowledge_documents where id = current_setting('issue171.new_draft')::uuid), 'Version advances across uploads'
);
select issue171_test.check_true(
  (select status = 'archived' from public.ai_knowledge_documents where id = current_setting('issue171.alpha_draft')::uuid), 'Previous active version is archived'
);
select public.set_ai_knowledge_document_state(current_setting('issue171.new_draft')::uuid, 'withdraw');
select set_config('request.jwt.claim.sub', 'a1710000-0000-4000-8000-000000000001', true);
select issue171_test.check_true(not exists (select 1 from public.ai_knowledge_documents), 'Alpha lead cannot read archived or withdrawn versions');
select issue171_test.check_true(not exists (
  select 1 from public.ai_query_cache where query_hash = repeat('a171', 16)
), 'Archived source revokes direct cache visibility');

rollback;
