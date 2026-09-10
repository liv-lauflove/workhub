-- =====================================================================
-- Migration: Auto Claim Team Invitations on User Registration
-- Issue #16: [Team] Fitur Invite Anggota Tim
-- =====================================================================
-- Updates handle_new_user() trigger function to:
--   1. Check if the registering user's email matches a pending team_invitation.
--   2. If match found: assign team_id and role from the invitation.
--   3. Mark the team_invitation as 'accepted'.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_name text;
  avatar_val text;
  github_val text;
  assigned_team_id uuid;
  assigned_role public.user_role := 'member';
  active_invitation_id uuid;
begin
  -- 1. Check for an active pending invitation for this email
  select id, team_id, role
  into active_invitation_id, assigned_team_id, assigned_role
  from public.team_invitations
  where email = new.email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  -- Fallback to 'member' if no invitation or role is null
  if assigned_role is null then
    assigned_role := 'member';
  end if;

  -- 2. Resolve display name: metadata full_name -> metadata name -> email prefix -> 'User'
  default_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'User'
  );

  -- 3. Resolve avatar url: metadata avatar_url (OAuth) -> Dicebear fallback
  avatar_val := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || default_name
  );

  -- 4. Resolve GitHub username if signed in via GitHub OAuth
  github_val := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    null
  );

  -- 5. Insert into profiles with the assigned team and role
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
    assigned_role,
    assigned_team_id,
    github_val,
    avatar_val
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = coalesce(excluded.role, public.profiles.role),
    team_id = coalesce(excluded.team_id, public.profiles.team_id),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    github_username = coalesce(public.profiles.github_username, excluded.github_username);

  -- 6. Mark the invitation as accepted
  if active_invitation_id is not null then
    update public.team_invitations
    set status = 'accepted'
    where id = active_invitation_id;
  end if;

  return new;
end;
$$;
