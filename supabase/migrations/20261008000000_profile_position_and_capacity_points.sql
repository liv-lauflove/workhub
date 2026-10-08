-- =====================================================================
-- Migration: Add Position & Capacity Points to Profiles Table
-- Issue #105: [Database] Migrasi Kolom Job Position dan Individual
--             Capacity Points pada Tabel Profiles
-- Source: Employee_1945_20260930072527.xlsx (BSA Tech Division)
-- =====================================================================

-- 1. Alter profiles table to add position and capacity_points columns
alter table public.profiles
  add column if not exists position text,
  add column if not exists capacity_points int not null default 100;

-- 2. Add validation constraint for capacity_points if not already present
do $$ begin
  alter table public.profiles
    add constraint profiles_capacity_points_check check (capacity_points > 0);
exception
  when duplicate_object then null;
end $$;

-- 3. Backfill data for existing employees from Employee_1945 master dataset
-- Management
update public.profiles
set position = 'Head of Tech', capacity_points = 300
where id = 'd0000000-0000-0000-0000-000000000001' or full_name = 'I Kadek Yoga Segara';

-- Aegis Leaders
update public.profiles
set position = 'Tech Principal', capacity_points = 250
where id = 'd0000000-0000-0000-0000-000000000003' or full_name = 'Kadek Angga Wiraprayudi';

update public.profiles
set position = 'Tech Lead', capacity_points = 250
where id = 'd0000000-0000-0000-0000-000000000004' or full_name = 'Detut Indra Sumpertrisno Adhi Nurjana';

-- Aegis Members
update public.profiles
set position = 'Tech Specialist', capacity_points = 150
where id = 'd0000000-0000-0000-0000-000000000002' or full_name = 'I Wayan Prawira Ariadi';

update public.profiles
set position = 'Tech Specialist', capacity_points = 150
where id = 'd0000000-0000-0000-0000-000000000006' or full_name = 'Josua Geovani Sinaga';

update public.profiles
set position = 'Software Engineer', capacity_points = 100
where id = 'd0000000-0000-0000-0000-000000000005' or full_name = 'I Nyoman Widiarta';

update public.profiles
set position = 'Software Engineer', capacity_points = 100
where id = 'd0000000-0000-0000-0000-000000000007' or full_name = 'I Nyoman Tri Budhi Palantra';

update public.profiles
set position = 'Software Engineer', capacity_points = 100
where id = 'd0000000-0000-0000-0000-000000000008' or full_name = 'I Made Adi Palguna';

update public.profiles
set position = 'Software Engineer', capacity_points = 100
where id = 'd0000000-0000-0000-0000-000000000009' or full_name = 'Sujud Satwikayana';

update public.profiles
set position = 'Software Engineer', capacity_points = 100
where id = 'd0000000-0000-0000-0000-00000000000a' or full_name = 'Azian Aswari Syamsul';

-- Sentinel Leaders
update public.profiles
set position = 'Tech-Ops Principal', capacity_points = 250
where id = 'd0000000-0000-0000-0000-00000000000b' or full_name = 'I Made Eka Mahendra';

update public.profiles
set position = 'Tech-Ops Manager', capacity_points = 300
where id = 'd0000000-0000-0000-0000-00000000000c' or full_name = 'Gita Nurhabibah Kurnia';

-- Sentinel Members
update public.profiles
set position = 'Tech Ops', capacity_points = 100
where id = 'd0000000-0000-0000-0000-00000000000d' or full_name = 'Anak Agung Sagung Istri Ningrat';

update public.profiles
set position = 'Tech Ops', capacity_points = 100
where id = 'd0000000-0000-0000-0000-00000000000e' or full_name = 'Ni Putu Eka Januartati';

update public.profiles
set position = 'Tech Ops', capacity_points = 100
where id = 'd0000000-0000-0000-0000-00000000000f' or full_name = 'Gusti Made Dwitaningsih';

-- 4. Index for position lookup
create index if not exists idx_profiles_position on public.profiles(position);
