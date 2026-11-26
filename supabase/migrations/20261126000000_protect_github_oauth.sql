create extension if not exists supabase_vault with schema vault;

-- Vault must not be readable by either Data API client role.
do $$
begin
  if exists (
    select 1 from (values ('anon'), ('authenticated')) r(client)
    where has_schema_privilege(client, 'vault', 'usage')
      and (has_any_column_privilege(client, 'vault.decrypted_secrets', 'select')
        or has_any_column_privilege(client, 'vault.secrets', 'select'))
  ) then
    raise exception 'Review existing client grants on Vault before migrating';
  end if;
end $$;

alter table public.github_integrations add column link_method text
  not null default 'oauth' check (link_method in ('manual', 'oauth'));
update public.github_integrations set link_method = 'manual', scope = null
  where access_token = 'manual_sync';

do $$
declare
  entry record;
begin
  for entry in select id, access_token from public.github_integrations
    where access_token not in ('manual_sync', 'oauth_linked', '')
  loop
    perform vault.create_secret(entry.access_token, 'workhub.github.' || entry.id);
  end loop;
end $$;
alter table public.github_integrations drop column access_token;

revoke all privileges on public.github_integrations from public, anon, authenticated;
grant select on public.github_integrations to authenticated;
alter table public.github_integrations enable row level security;
drop policy if exists github_integrations_select_own on public.github_integrations;
create policy github_integrations_select_own on public.github_integrations
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists github_integrations_insert_own on public.github_integrations;
drop policy if exists github_integrations_update_own on public.github_integrations;
drop policy if exists github_integrations_delete_own on public.github_integrations;

-- Includes deletions cascading from profiles/auth.users.
create function public.delete_github_vault_secret() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from vault.secrets where name = 'workhub.github.' || old.id;
  return old;
end $$;
revoke all on function public.delete_github_vault_secret() from public, anon, authenticated, service_role;
create trigger delete_github_vault_secret after delete on public.github_integrations
  for each row execute function public.delete_github_vault_secret();

-- All three operations lock the account first. Auth unlink happens in GoTrue;
-- a concurrent relink must never let a stale cleanup delete its new credential.
create function public.save_github_connection(
  p_user_id uuid, p_username text, p_github_id text default null,
  p_token text default null, p_scope text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  integration_id uuid;
  secret_id uuid;
  github_identity text;
begin
  perform 1 from auth.users where id = p_user_id for update;
  if not found then raise exception 'Account no longer exists'; end if;
  select provider_id into github_identity from auth.identities
    where user_id = p_user_id and provider = 'github';
  if github_identity is distinct from p_github_id
    or nullif(trim(p_username), '') is null
    or (p_github_id is null) <> (p_token is null)
    or p_token = '' then
    raise exception 'GitHub identity or credential mismatch';
  end if;

  update public.profiles set github_username = p_username where id = p_user_id;
  if not found then raise exception 'Profile no longer exists'; end if;
  insert into public.github_integrations(user_id, github_user_id, scope, link_method)
    values (p_user_id, coalesce(p_github_id, p_username), p_scope,
      case when p_github_id is null then 'manual' else 'oauth' end)
    on conflict (user_id) do update set github_user_id = excluded.github_user_id,
      scope = excluded.scope, link_method = excluded.link_method,
      connected_at = case when github_integrations.github_user_id = excluded.github_user_id
        and github_integrations.link_method = excluded.link_method then github_integrations.connected_at else now() end
    returning id into integration_id;
  select id into secret_id from vault.secrets where name = 'workhub.github.' || integration_id;
  if p_token is null then
    delete from vault.secrets where id = secret_id;
  elsif secret_id is null then
    perform vault.create_secret(p_token, 'workhub.github.' || integration_id);
  else
    perform vault.update_secret(secret_id, p_token);
  end if;
end $$;

create function public.clear_github_connection(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = p_user_id for update;
  if exists (select 1 from auth.identities where user_id = p_user_id and provider = 'github') then
    raise exception 'GitHub identity is still linked';
  end if;
  delete from public.github_integrations where user_id = p_user_id;
  update public.profiles set github_username = null where id = p_user_id;
end $$;

revoke all on function public.save_github_connection(uuid, text, text, text, text),
  public.clear_github_connection(uuid) from public, anon, authenticated, service_role;
grant execute on function public.save_github_connection(uuid, text, text, text, text),
  public.clear_github_connection(uuid) to service_role;
notify pgrst, 'reload schema';
