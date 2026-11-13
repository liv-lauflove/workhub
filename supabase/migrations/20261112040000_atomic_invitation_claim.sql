-- =====================================================================
-- Migration: Atomic Team Invitation Claim & Email Verification Enforcement
-- Issue #148: fix(auth): klaim undangan setelah verifikasi email secara atomik
-- Audit Reference: S04, B04 (High Priority)
-- =====================================================================

-- 1. Helper Index for pending invitations lookup by normalized email
create index if not exists idx_team_invitations_email_lower_pending
  on public.team_invitations (lower(trim(email)))
  where status = 'pending';

-- 2. Atomic Security Definer Function to Claim Invitation
create or replace function public.claim_team_invitation(
  p_user_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text;
  v_auth_email text;
  v_email_confirmed_at timestamptz;
  v_current_team_id uuid;
  v_invitation record;
begin
  if p_user_id is null or p_email is null then
    return false;
  end if;

  v_normalized_email := lower(trim(p_email));
  if v_normalized_email = '' then
    return false;
  end if;

  -- Verify actor authorization: authenticated callers may only claim for themselves
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return false;
  end if;

  -- Verify user exists in auth.users and has confirmed email
  select email, email_confirmed_at
  into v_auth_email, v_email_confirmed_at
  from auth.users
  where id = p_user_id;

  if not found or v_email_confirmed_at is null then
    return false;
  end if;

  -- Ensure the auth email matches the requested email
  if lower(trim(v_auth_email)) <> v_normalized_email then
    return false;
  end if;

  -- Lock profile row and ensure the user currently has no team
  select team_id
  into v_current_team_id
  from public.profiles
  where id = p_user_id
  for update;

  if not found or v_current_team_id is not null then
    return false;
  end if;

  -- Find and lock active pending invitation for this email atomically
  select id, team_id, role
  into v_invitation
  from public.team_invitations
  where lower(trim(email)) = v_normalized_email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found or v_invitation.id is null then
    return false;
  end if;

  -- Atomically update profile with team_id and role from invitation
  update public.profiles
  set
    team_id = v_invitation.team_id,
    role = coalesce(v_invitation.role, 'member'::public.user_role)
  where id = p_user_id
    and team_id is null;

  -- Atomically mark invitation as accepted
  update public.team_invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return true;
end;
$$;

revoke execute on function public.claim_team_invitation(uuid, text) from public, anon;
grant execute on function public.claim_team_invitation(uuid, text) to authenticated, service_role;

-- 3. Update public.handle_new_user() trigger function
-- When a user registers:
-- - Always insert into profiles with role = 'member' and team_id = NULL
-- - Only claim invitation if email is ALREADY confirmed (e.g. OAuth providers)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_name text;
  avatar_val text;
  github_val text;
begin
  -- Resolve display name: metadata full_name -> metadata name -> email prefix -> 'User'
  default_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'User'
  );

  -- Resolve avatar url: metadata avatar_url (OAuth) -> Dicebear fallback
  avatar_val := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || default_name
  );

  -- Resolve GitHub username if signed in via GitHub OAuth
  github_val := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    null
  );

  -- Always create profile with role = 'member' and team_id = NULL
  insert into public.profiles (
    id,
    full_name,
    role,
    team_id,
    github_username,
    avatar_url
  ) values (
    new.id,
    default_name,
    'member',
    null,
    github_val,
    avatar_val
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    github_username = coalesce(public.profiles.github_username, excluded.github_username);

  -- If user already has confirmed email (e.g. OAuth signup), atomically claim invitation
  if new.email_confirmed_at is not null and new.email is not null then
    perform public.claim_team_invitation(new.id, new.email);
  end if;

  return new;
end;
$$;

-- Ensure on_auth_user_created trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Trigger on auth.users for AFTER UPDATE OF email_confirmed_at
-- When user verifies email (email_confirmed_at changes from NULL to timestamp),
-- atomically claim any pending invitation.
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null and new.email is not null then
    perform public.claim_team_invitation(new.id, new.email);
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_user_email_confirmed() from public, anon;

drop trigger if exists on_auth_user_email_confirmed on auth.users;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_email_confirmed();

notify pgrst, 'reload schema';
