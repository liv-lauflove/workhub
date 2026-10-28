-- =====================================================================
-- Migration: Auto Sync auth.users to public.profiles via Trigger
-- Issue #14: [Auth] Sinkronisasi Data Profil (Trigger DB)
-- =====================================================================

-- 1. Create or replace trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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

  insert into public.profiles (
    id,
    full_name,
    role,
    github_username,
    avatar_url
  ) values (
    new.id,
    default_name,
    'member',
    github_val,
    avatar_val
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    github_username = coalesce(public.profiles.github_username, excluded.github_username);

  return new;
end;
$$;

-- 2. Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill existing auth.users that may not have profiles yet
insert into public.profiles (
  id,
  full_name,
  role,
  avatar_url
)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'User'
  ),
  'member',
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User')
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
