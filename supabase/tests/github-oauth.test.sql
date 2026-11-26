-- Run on development/test after the migration. All identities and secrets roll back.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';
set local plpgsql.check_asserts = on;

insert into auth.users(id,email) values
  ('a1520000-0000-4000-8000-000000000001','issue152-a@workhub.invalid'),
  ('a1520000-0000-4000-8000-000000000002','issue152-b@workhub.invalid');
insert into auth.identities(user_id, provider_id, provider, identity_data)
values ('a1520000-0000-4000-8000-000000000001','15201','github','{"sub":"15201"}');

set local role service_role;
select public.save_github_connection('a1520000-0000-4000-8000-000000000001','fixture-a','15201','dummy-old','read:user');
select public.save_github_connection('a1520000-0000-4000-8000-000000000001','fixture-a','15201','dummy-rotated','read:user');
select public.save_github_connection('a1520000-0000-4000-8000-000000000002','fixture-b');
reset role;

do $$
declare secret_name text;
begin
  select 'workhub.github.' || id into strict secret_name from public.github_integrations
    where user_id = 'a1520000-0000-4000-8000-000000000001';
  assert (select decrypted_secret = 'dummy-rotated' from vault.decrypted_secrets where name = secret_name);
  assert (select secret <> 'dummy-rotated' from vault.secrets where name = secret_name);
  assert not exists (select 1 from public.github_integrations i join vault.secrets s on s.name = 'workhub.github.' || i.id
    where i.user_id = 'a1520000-0000-4000-8000-000000000002');
  begin
    perform public.clear_github_connection('a1520000-0000-4000-8000-000000000001');
    raise exception 'Cleanup ignored a linked identity' using errcode = '23514';
  exception when raise_exception then null; end;
  begin
    perform public.save_github_connection('a1520000-0000-4000-8000-000000000001','wrong','15202','dummy');
    raise exception 'Credential owner mismatch accepted' using errcode = '23514';
  exception when raise_exception then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','a1520000-0000-4000-8000-000000000001',true);
do $$
declare metadata jsonb;
begin
  select to_jsonb(i) into strict metadata from public.github_integrations i where user_id = auth.uid();
  assert metadata->>'github_user_id' = '15201' and not (metadata ? 'access_token') and metadata::text not like '%dummy-%';
  assert not exists(select 1 from public.github_integrations where user_id = 'a1520000-0000-4000-8000-000000000002');
  assert not has_function_privilege(current_user,'public.save_github_connection(uuid,text,text,text,text)','execute');
  assert not has_function_privilege(current_user,'public.clear_github_connection(uuid)','execute');
  begin
    perform 1 from vault.decrypted_secrets;
    raise exception 'Unexpected client access to Vault';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A failed database cleanup must restore both the integration and its Vault secret.
delete from auth.identities where user_id = 'a1520000-0000-4000-8000-000000000001';
create function pg_temp.fail_profile_update() returns trigger language plpgsql as $$
begin raise check_violation; end $$;
create trigger issue152_failure before update on public.profiles for each row
  when (old.id = 'a1520000-0000-4000-8000-000000000001') execute function pg_temp.fail_profile_update();
do $$
begin
  begin
    perform public.clear_github_connection('a1520000-0000-4000-8000-000000000001');
    raise exception 'Expected simulated profile failure';
  exception when check_violation then null; end;
  assert exists (select 1 from public.github_integrations i join vault.secrets s on s.name = 'workhub.github.' || i.id
    where i.user_id = 'a1520000-0000-4000-8000-000000000001');
end $$;
drop trigger issue152_failure on public.profiles;
do $$
declare secret_name text;
begin
  select 'workhub.github.' || id into strict secret_name from public.github_integrations where user_id = 'a1520000-0000-4000-8000-000000000001';
  perform public.clear_github_connection('a1520000-0000-4000-8000-000000000001');
  perform public.clear_github_connection('a1520000-0000-4000-8000-000000000001');
  assert not exists (select 1 from vault.secrets where name = secret_name);
  assert not exists (select 1 from public.github_integrations where user_id = 'a1520000-0000-4000-8000-000000000001');
  assert (select github_username is null from public.profiles where id = 'a1520000-0000-4000-8000-000000000001');
end $$;
rollback;
select 'GitHub Vault and unlink checks passed; fixtures rolled back' as result;
