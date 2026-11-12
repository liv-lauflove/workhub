-- A table-level grant overrides a restricted column grant.
revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from public, anon, authenticated;
revoke all privileges
  (id, full_name, role, team_id, github_username, avatar_url,
   created_at, phone, position, capacity_points)
  on table public.profiles from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url, github_username, phone, position)
  on table public.profiles to authenticated;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_leader on public.profiles;

create or replace function public.update_team_member(
  p_user_id uuid,
  p_team_id uuid,
  p_role public.user_role default null,
  p_capacity_points integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  updated_id uuid;
begin
  if actor_id is null then
    raise exception 'Sesi autentikasi tidak valid.' using errcode = '42501';
  end if;

  if p_user_id is null or p_team_id is null
    or (p_role is null and p_capacity_points is null) then
    raise exception 'Data perubahan anggota tidak lengkap.' using errcode = '22023';
  end if;

  if p_capacity_points is not null
    and (p_capacity_points < 10 or p_capacity_points > 1000) then
    raise exception 'Kapasitas poin harus berada di antara 10 hingga 1000.'
      using errcode = '22023';
  end if;

  -- Serialize role changes so simultaneous self-demotions retain a leader.
  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Tim tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into actor_profile from public.profiles
    where id = actor_id for share;
  if not found or actor_profile.role <> 'leader' then
    raise exception 'Hanya leader yang dapat mengubah role atau kapasitas anggota.'
      using errcode = '42501';
  end if;

  if actor_profile.team_id is distinct from 'e3333333-3333-3333-3333-333333333333'::uuid
    and actor_profile.team_id is distinct from p_team_id then
    raise exception 'Anda tidak memiliki akses ke tim ini.' using errcode = '42501';
  end if;

  select * into target_profile from public.profiles
    where id = p_user_id and team_id = p_team_id for update;
  if not found then
    raise exception 'Anggota tidak ditemukan pada tim tersebut.' using errcode = 'P0002';
  end if;

  if actor_id = p_user_id and p_role = 'member' and (
    select count(*) from public.profiles
    where team_id = p_team_id and role = 'leader'
  ) <= 1 then
    raise exception 'Anda adalah leader terakhir. Promosikan anggota lain sebelum turun jabatan.'
      using errcode = '23514';
  end if;

  update public.profiles
    set role = coalesce(p_role, role),
        capacity_points = coalesce(p_capacity_points, capacity_points)
    where id = p_user_id and team_id = p_team_id
    returning id into updated_id;
  if not found then
    raise exception 'Anggota tidak ditemukan pada tim tersebut.' using errcode = 'P0002';
  end if;

  return updated_id;
end;
$$;

revoke execute on function public.update_team_member(uuid, uuid, public.user_role, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.update_team_member(uuid, uuid, public.user_role, integer)
  to authenticated;

notify pgrst, 'reload schema';
