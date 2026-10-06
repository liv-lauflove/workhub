-- =====================================================================
-- Task & Performance Dashboard — Database Seed Data (seed.sql)
-- Real Employee Data: 15 Profiles, 3 Teams (Aegis, Sentinel, Management)
-- Source: Employee_1945_20260930072527.xlsx (BSA Tech Division)
-- Fully Relational & Production-Ready for Q4 2026 Operations
-- =====================================================================

-- =====================================================================
-- STEP 0: Clean existing data (safe truncate cascade)
-- =====================================================================
truncate table activity_log cascade;
truncate table task_dependencies cascade;
truncate table task_comments cascade;
truncate table task_attachments cascade;
truncate table task_subtasks cascade;
truncate table notifications cascade;
truncate table tasks cascade;
truncate table board_columns cascade;
truncate table projects cascade;
truncate table milestones cascade;
truncate table team_invitations cascade;
truncate table github_integrations cascade;
truncate table capacity_settings cascade;
truncate table profiles cascade;
delete from auth.users;
truncate table teams cascade;

-- =====================================================================
-- STEP 0.1: Ensure teams constraint allows 'Management'
alter table teams drop constraint if exists teams_name_check;
alter table teams add constraint teams_name_check
  check (name in ('Aegis', 'Sentinel', 'Management'));

-- =====================================================================
-- STEP 0.2: Ensure profiles table has phone column
-- =====================================================================
alter table public.profiles
  add column if not exists phone text;

-- ---------------------------------------------------------------------
-- 1. Teams & Capacity Settings
-- ---------------------------------------------------------------------
insert into teams (id, name) values
  ('e1111111-1111-1111-1111-111111111111', 'Aegis'),
  ('e2222222-2222-2222-2222-222222222222', 'Sentinel'),
  ('e3333333-3333-3333-3333-333333333333', 'Management')
on conflict (name) do nothing;

insert into capacity_settings (team_id, baseline_points) values
  ('e1111111-1111-1111-1111-111111111111', 20),
  ('e2222222-2222-2222-2222-222222222222', 20),
  ('e3333333-3333-3333-3333-333333333333', 10)
on conflict (team_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Auth Users (Supabase auth.users)
-- Default password: Password123! (bcrypt hashed via crypt/gen_salt)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values
  -- ========== MANAGEMENT ==========
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'yoga@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Kadek Yoga Segara"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  -- ========== AEGIS ==========
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'wira@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Wayan Prawira Ariadi"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'prayudi@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Kadek Angga Wiraprayudi"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'detut@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Detut Indra Sumpertrisno Adhi Nurjana"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'widiarta@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Nyoman Widiarta"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000006',
    'authenticated',
    'authenticated',
    'josua.sinaga@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Josua Geovani Sinaga"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000007',
    'authenticated',
    'authenticated',
    'budhi@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Nyoman Tri Budhi Palantra"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000008',
    'authenticated',
    'authenticated',
    'palguna@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Made Adi Palguna"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000009',
    'authenticated',
    'authenticated',
    'sujud@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sujud Satwikayana"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000a',
    'authenticated',
    'authenticated',
    'azian@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Azian Aswari Syamsul"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  -- ========== SENTINEL ==========
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000b',
    'authenticated',
    'authenticated',
    'eka@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"I Made Eka Mahendra"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000c',
    'authenticated',
    'authenticated',
    'gita@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gita Nurhabibah Kurnia"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000d',
    'authenticated',
    'authenticated',
    'sagung@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anak Agung Sagung Istri Ningrat"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000e',
    'authenticated',
    'authenticated',
    'ekajanuartati@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ni Putu Eka Januartati"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-00000000000f',
    'authenticated',
    'authenticated',
    'dwita@bsa.id',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gusti Made Dwitaningsih"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Profiles (Linked to auth.users and teams)
-- ---------------------------------------------------------------------
insert into profiles (id, full_name, role, team_id, avatar_url, phone) values
  -- Management (1 leader)
  (
    'd0000000-0000-0000-0000-000000000001',
    'I Kadek Yoga Segara',
    'leader',
    'e3333333-3333-3333-3333-333333333333',
    'https://api.dicebear.com/7.x/initials/svg?seed=YS',
    '+6287860991436'
  ),
  -- Aegis Leaders (2)
  (
    'd0000000-0000-0000-0000-000000000003',
    'Kadek Angga Wiraprayudi',
    'leader',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=KAW',
    '+6281237802297'
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'Detut Indra Sumpertrisno Adhi Nurjana',
    'leader',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=DI',
    '+6281325201001'
  ),
  -- Aegis Members (7)
  (
    'd0000000-0000-0000-0000-000000000002',
    'I Wayan Prawira Ariadi',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=WPA',
    '+6281338057725'
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'I Nyoman Widiarta',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=NW',
    '+6281237768563'
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'Josua Geovani Sinaga',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=JGS',
    '+6285183231055'
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    'I Nyoman Tri Budhi Palantra',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=TBP',
    '+6287862465431'
  ),
  (
    'd0000000-0000-0000-0000-000000000008',
    'I Made Adi Palguna',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=MAP',
    '+6285739926513'
  ),
  (
    'd0000000-0000-0000-0000-000000000009',
    'Sujud Satwikayana',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=SS',
    '+6282247370043'
  ),
  (
    'd0000000-0000-0000-0000-00000000000a',
    'Azian Aswari Syamsul',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'https://api.dicebear.com/7.x/initials/svg?seed=AAS',
    '+6285225541831'
  ),
  -- Sentinel Leaders (2)
  (
    'd0000000-0000-0000-0000-00000000000b',
    'I Made Eka Mahendra',
    'leader',
    'e2222222-2222-2222-2222-222222222222',
    'https://api.dicebear.com/7.x/initials/svg?seed=MEM',
    '+628113971870'
  ),
  (
    'd0000000-0000-0000-0000-00000000000c',
    'Gita Nurhabibah Kurnia',
    'leader',
    'e2222222-2222-2222-2222-222222222222',
    'https://api.dicebear.com/7.x/initials/svg?seed=GNK',
    '+6281282041555'
  ),
  -- Sentinel Members (3)
  (
    'd0000000-0000-0000-0000-00000000000d',
    'Anak Agung Sagung Istri Ningrat',
    'member',
    'e2222222-2222-2222-2222-222222222222',
    'https://api.dicebear.com/7.x/initials/svg?seed=SIN',
    '+6281337733883'
  ),
  (
    'd0000000-0000-0000-0000-00000000000e',
    'Ni Putu Eka Januartati',
    'member',
    'e2222222-2222-2222-2222-222222222222',
    'https://api.dicebear.com/7.x/initials/svg?seed=EJ',
    '+6287864291484'
  ),
  (
    'd0000000-0000-0000-0000-00000000000f',
    'Gusti Made Dwitaningsih',
    'member',
    'e2222222-2222-2222-2222-222222222222',
    'https://api.dicebear.com/7.x/initials/svg?seed=GMD',
    '+6287761811177'
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  team_id = excluded.team_id,
  avatar_url = excluded.avatar_url,
  phone = excluded.phone;

-- ===================
-- STEP 2: Milestones (Q4 2026 & Q1 2027 Strategic Targets)
-- ===================
insert into milestones (id, title, description, pic_id, start_date, target_date, status, created_by) values
  (
    'f0000000-0000-0000-0000-000000000001',
    'Q4 2026 Platform Modernization & Stability',
    'Modernisasi arsitektur frontend/backend, performa real-time dashboard, dan standarisasi developer experience divisi Tech.',
    'd0000000-0000-0000-0000-000000000001', -- Yoga Segara (Head of Tech)
    '2026-10-01',
    '2026-12-31',
    'in_progress',
    'd0000000-0000-0000-0000-000000000001'
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'Q4 2026 Cloud Resilience & Security Hardening',
    'Implementasi disaster recovery, auto-scaling multi-AZ, audit zero-trust security, dan optimasi SLA sistem.',
    'd0000000-0000-0000-0000-00000000000b', -- Eka Mahendra (Tech-Ops Principal)
    '2026-10-01',
    '2026-12-31',
    'in_progress',
    'd0000000-0000-0000-0000-000000000001'
  ),
  (
    'f0000000-0000-0000-0000-000000000003',
    'Q1 2027 Automation & Intelligence Engine',
    'Eksplorasi otomasi workflow internal, integrasi LLM agent untuk task assignment cerdas, dan predictive workload analytics.',
    'd0000000-0000-0000-0000-000000000001', -- Yoga Segara (Head of Tech)
    '2026-11-01',
    '2027-02-28',
    'planned',
    'd0000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;

-- ===================
-- STEP 3: Projects (5 Active Projects across Squads)
-- ===================
insert into projects (id, milestone_id, team_id, name, description, pic_id, status, created_by) values
  -- Project 1 (Aegis)
  (
    'b0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'e1111111-1111-1111-1111-111111111111', -- Aegis
    'Workhub Web Platform',
    'Pengembangan antarmuka dashboard responsif, interaksi drag-and-drop Kanban, manajemen workload, dan kolaborasi tim.',
    'd0000000-0000-0000-0000-000000000004', -- Detut Indra (Tech Lead)
    'in_progress',
    'd0000000-0000-0000-0000-000000000004'
  ),
  -- Project 2 (Aegis)
  (
    'b0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'e1111111-1111-1111-1111-111111111111', -- Aegis
    'Scalable Core API & Microservices',
    'Perancangan endpoint performa tinggi, caching layer, rate limiting, agregasi laporan town hall, dan integrasi webhook.',
    'd0000000-0000-0000-0000-000000000003', -- Prayudi (Tech Principal)
    'in_progress',
    'd0000000-0000-0000-0000-000000000003'
  ),
  -- Project 3 (Sentinel)
  (
    'b0000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000002',
    'e2222222-2222-2222-2222-222222222222', -- Sentinel
    'Multi-Region Cloud Infrastructure & Disaster Recovery',
    'Manajemen cluster PostgreSQL multi-AZ, strategi failover, automated snapshot, dan monitoring telemetri infrastruktur.',
    'd0000000-0000-0000-0000-00000000000b', -- Eka Mahendra (Tech-Ops Principal)
    'in_progress',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  -- Project 4 (Sentinel)
  (
    'b0000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000002',
    'e2222222-2222-2222-2222-222222222222', -- Sentinel
    'DevSecOps & Zero-Trust Security Pipeline',
    'Otomasi CI/CD GitHub Actions, vulnerability scanning, manajemen secret vault, pengetatan policy RLS, dan compliance.',
    'd0000000-0000-0000-0000-00000000000c', -- Gita (Tech-Ops Manager)
    'in_progress',
    'd0000000-0000-0000-0000-00000000000c'
  ),
  -- Project 5 (Aegis)
  (
    'b0000000-0000-0000-0000-000000000005',
    'f0000000-0000-0000-0000-000000000003',
    'e1111111-1111-1111-1111-111111111111', -- Aegis
    'Workflow Automation & AI Assistant',
    'Riset dan implementasi prototipe asisten AI untuk estimasi beban kerja, auto-tagging prioritas tiket, dan automasi notifikasi.',
    'd0000000-0000-0000-0000-000000000003', -- Prayudi (Tech Principal)
    'planned',
    'd0000000-0000-0000-0000-000000000003'
  )
on conflict (id) do nothing;

-- ===================
-- STEP 4: Board Columns (4 Columns per Project = 20 Columns)
-- ===================
insert into board_columns (id, project_id, name, position, is_default) values
  -- Project 1 Columns
  ('c0000000-0000-0000-0001-000000000001', 'b0000000-0000-0000-0000-000000000001', 'To Do', 0, true),
  ('c0000000-0000-0000-0001-000000000002', 'b0000000-0000-0000-0000-000000000001', 'In Progress', 1, false),
  ('c0000000-0000-0000-0001-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Review', 2, false),
  ('c0000000-0000-0000-0001-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Done', 3, false),

  -- Project 2 Columns
  ('c0000000-0000-0000-0002-000000000001', 'b0000000-0000-0000-0000-000000000002', 'To Do', 0, true),
  ('c0000000-0000-0000-0002-000000000002', 'b0000000-0000-0000-0000-000000000002', 'In Progress', 1, false),
  ('c0000000-0000-0000-0002-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Review', 2, false),
  ('c0000000-0000-0000-0002-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Done', 3, false),

  -- Project 3 Columns
  ('c0000000-0000-0000-0003-000000000001', 'b0000000-0000-0000-0000-000000000003', 'To Do', 0, true),
  ('c0000000-0000-0000-0003-000000000002', 'b0000000-0000-0000-0000-000000000003', 'In Progress', 1, false),
  ('c0000000-0000-0000-0003-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Review', 2, false),
  ('c0000000-0000-0000-0003-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Done', 3, false),

  -- Project 4 Columns
  ('c0000000-0000-0000-0004-000000000001', 'b0000000-0000-0000-0000-000000000004', 'To Do', 0, true),
  ('c0000000-0000-0000-0004-000000000002', 'b0000000-0000-0000-0000-000000000004', 'In Progress', 1, false),
  ('c0000000-0000-0000-0004-000000000003', 'b0000000-0000-0000-0000-000000000004', 'Review', 2, false),
  ('c0000000-0000-0000-0004-000000000004', 'b0000000-0000-0000-0000-000000000004', 'Done', 3, false),

  -- Project 5 Columns
  ('c0000000-0000-0000-0005-000000000001', 'b0000000-0000-0000-0000-000000000005', 'To Do', 0, true),
  ('c0000000-0000-0000-0005-000000000002', 'b0000000-0000-0000-0000-000000000005', 'In Progress', 1, false),
  ('c0000000-0000-0000-0005-000000000003', 'b0000000-0000-0000-0000-000000000005', 'Review', 2, false),
  ('c0000000-0000-0000-0005-000000000004', 'b0000000-0000-0000-0000-000000000005', 'Done', 3, false)
on conflict (id) do nothing;

-- ===================
-- STEP 5: Tasks (45 Real Tasks, All Due Dates in Oct - Dec 2026)
-- ===================
insert into tasks (
  id, project_id, column_id, title, description,
  assignee_id, priority, origin, origin_note, github_branch, due_date, created_by
) values
  -- ===================================================================
  -- PROJECT 1: Workhub Web Platform (Aegis)
  -- ===================================================================
  (
    '70000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000002', -- In Progress
    'Optimasi Performa Drag-and-Drop Kanban Board',
    'Implementasikan optimistic UI update dan throttle event sensor pada dnd-kit agar drag kartu terasa mulus tanpa jitter.',
    'd0000000-0000-0000-0000-000000000008', -- Palguna (Software Engineer)
    'critical', 'normal', null, 'feat/kanban-perf', '2026-10-12',
    'd0000000-0000-0000-0000-000000000004' -- Detut
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000002', -- In Progress
    '[CS Urgent] Sesi Login Terputus Saat Pindah Tab Browser',
    'Laporan tiket CS #5021: Pengguna melaporkan token refresh Supabase kedaluwarsa prematur saat tab tidak aktif.',
    'd0000000-0000-0000-0000-000000000004', -- Detut Indra (Tech Lead)
    'critical', 'cs_complaint', 'Tiket #5021 eskalasi CS Operational hotline pada 2026-09-30.', 'fix/session-expiry', '2026-10-06',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000003', -- Review
    'Penyempurnaan Halaman Detail Task & Activity Log Thread',
    'Integrasikan timeline pergerakan status task, badge perubahan assignee, dan thread diskusi dengan avatar dinamis.',
    'd0000000-0000-0000-0000-000000000009', -- Sujud (Software Engineer)
    'high', 'normal', null, 'feat/task-timeline', '2026-10-14',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000004', -- Done
    'Pengembangan Komponen Navigasi Sidebar Responsif',
    'Layout navigasi samping dengan sub-menu per proyek, status active route, dan indikator jumlah notifikasi belum terbaca.',
    'd0000000-0000-0000-0000-000000000007', -- Budhi (Software Engineer)
    'medium', 'normal', null, 'feat/responsive-sidebar', '2026-10-08',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000001', -- To Do
    'Komponen Upload Lampiran File ke Supabase Storage',
    'Dukungan drag & drop berkas PDF, PNG, JPG hingga 5MB dengan progress bar dan thumbnail preview.',
    'd0000000-0000-0000-0000-000000000006', -- Josua (Tech Specialist)
    'medium', 'normal', null, null, '2026-10-22',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000002', -- In Progress
    'Filter Pencarian & Multi-Select Status pada Kanban Board',
    'Penyaringan kartu berdasarkan assignee, rentang tanggal jatuh tempo, dan label prioritas via URL query string.',
    'd0000000-0000-0000-0000-000000000005', -- Widiarta (Software Engineer)
    'high', 'normal', null, 'feat/board-filters', '2026-10-18',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000004', -- Done
    'Pengembangan Modul Undangan Member Tim via Email Token',
    'Alur invite member baru oleh leader tim dengan masa berlaku token 7 hari dan auto-claim saat registrasi.',
    'd0000000-0000-0000-0000-00000000000a', -- Azian (Software Engineer)
    'high', 'normal', null, 'feat/team-invite-token', '2026-10-09',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000001', -- To Do
    'Shortcut Keyboard Cepat untuk Pembuatan Task Baru',
    'Dukungan shortcut tombol "C" untuk open create task modal dan "Esc" untuk dismiss modal dialog.',
    'd0000000-0000-0000-0000-000000000002', -- Wira (Tech Specialist)
    'low', 'normal', null, null, '2026-11-05',
    'd0000000-0000-0000-0000-000000000004'
  ),
  (
    '70000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0001-000000000003', -- Review
    'Audit Aksesibilitas WCAG 2.1 AA pada Form Input',
    'Peningkatan contrast ratio elemen form, penambahan aria-labels, dan focus indicator untuk pengguna keyboard.',
    'd0000000-0000-0000-0000-00000000000a', -- Azian (Software Engineer)
    'medium', 'normal', null, 'audit/accessibility-a11y', '2026-10-25',
    'd0000000-0000-0000-0000-000000000004'
  ),

  -- ===================================================================
  -- PROJECT 2: Scalable Core API & Microservices (Aegis)
  -- ===================================================================
  (
    '70000000-0000-0000-0000-00000000000a',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000002', -- In Progress
    'Engine Kalkulasi Beban Kerja Realtime (Workload Capacity)',
    'Hitung akumulasi bobot task aktif dibagi baseline points tim per anggota dengan visualisasi warning overload (>80%).',
    'd0000000-0000-0000-0000-000000000005', -- Widiarta (Software Engineer)
    'critical', 'normal', null, 'feat/workload-engine-v2', '2026-10-15',
    'd0000000-0000-0000-0000-000000000003' -- Prayudi
  ),
  (
    '70000000-0000-0000-0000-00000000000b',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000002', -- In Progress
    'Arsitektur Event-Driven Sinkronisasi Status Task via Realtime',
    'Streaming pembaruan kartu Kanban secara langsung antar browser anggota tim menggunakan Supabase Postgres Realtime.',
    'd0000000-0000-0000-0000-000000000003', -- Prayudi (Tech Principal)
    'high', 'normal', null, 'feat/realtime-events', '2026-10-20',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000000c',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000004', -- Done
    'Pembuatan Endpoint Query Agregasi Performa Town Hall',
    'API penghasil matriks metrik completion rate kuartalan, distribusi bobot prioritas, dan rata-rata durasi penyelesaian.',
    'd0000000-0000-0000-0000-000000000007', -- Budhi (Software Engineer)
    'high', 'normal', null, 'feat/townhall-metrics-api', '2026-10-10',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000000d',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000001', -- To Do
    'Export Data Laporan ke Dokumen Excel & PDF Terformat',
    'Ekspor ringkasan eksekutif performa mingguan dengan chart visualisasi dalam format PDF dan spreadsheet XLS.',
    'd0000000-0000-0000-0000-000000000009', -- Sujud (Software Engineer)
    'medium', 'normal', null, null, '2026-11-12',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000000e',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000003', -- Review
    'Penerapan Redis Cache untuk Endpoint Metrik Workload',
    'Simpan cache kalkulasi beban kerja selama 60 detik dengan automated invalidation saat ada mutasi task baru.',
    'd0000000-0000-0000-0000-000000000002', -- Wira (Tech Specialist)
    'high', 'normal', null, 'perf/redis-workload-cache', '2026-10-24',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000000f',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000001', -- To Do
    'Rate Limiting & DDoS Protection pada Public API Endpoints',
    'Proteksi endpoint authentication dan public query dari brute-force request menggunakan token bucket algorithm.',
    'd0000000-0000-0000-0000-000000000006', -- Josua (Tech Specialist)
    'medium', 'normal', null, null, '2026-11-08',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0002-000000000002', -- In Progress
    'Review Arsitektur Sistem Q4 & Technical Debt Mitigation',
    'Evaluasi dependensi pihak ketiga, refaktor duplicate helper query, dan pemantapan kontrak API antar modul.',
    'd0000000-0000-0000-0000-000000000001', -- Yoga Segara (Head of Tech)
    'high', 'normal', null, 'audit/q4-architecture-review', '2026-10-28',
    'd0000000-0000-0000-0000-000000000003'
  ),

  -- ===================================================================
  -- PROJECT 3: Multi-Region Cloud Infrastructure & DR (Sentinel)
  -- ===================================================================
  (
    '70000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000002', -- In Progress
    'Konfigurasi Multi-AZ PostgreSQL Cluster & Read Replica',
    'Implementasikan read replica untuk offload query pelaporan berat agar database master tetap responsif untuk transaksi kartu.',
    'd0000000-0000-0000-0000-00000000000b', -- Eka Mahendra (Tech-Ops Principal)
    'critical', 'normal', null, 'infra/pg-read-replica', '2026-10-18',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  (
    '70000000-0000-0000-0000-000000000012',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000004', -- Done
    'Pengaturan Backup Otomatis & Uji Coba Point-In-Time Restore',
    'Jadwalkan dump harian ke cold storage S3 dan simulasi pemulihan snapshot data tanpa data corruption.',
    'd0000000-0000-0000-0000-00000000000e', -- Eka Januartati (Tech Ops)
    'high', 'normal', null, 'infra/backup-pitr', '2026-10-07',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  (
    '70000000-0000-0000-0000-000000000013',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000002', -- In Progress
    'Pembuatan Dashboard Grafana untuk Monitoring Kinerja Node',
    'Visualisasikan penggunaan RAM, CPU load average, koneksi pool pgbouncer, dan latency query PostgreSQL.',
    'd0000000-0000-0000-0000-00000000000d', -- Sagung (Tech Ops)
    'high', 'normal', null, 'infra/grafana-telemetry', '2026-10-21',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  (
    '70000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000003', -- Review
    'Sistem Notifikasi Insiden Real-time ke Telegram & Slack',
    'Alert webhook otomatis saat threshold memory >85% atau response API melebihi batas toleransi 1.5 detik.',
    'd0000000-0000-0000-0000-00000000000f', -- Dwita (Tech Ops)
    'high', 'normal', null, 'infra/slack-alerting', '2026-10-15',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  (
    '70000000-0000-0000-0000-000000000015',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000001', -- To Do
    'Penyusunan Runbook Disaster Recovery & Failover Manual',
    'Dokumentasi langkah panduan teknis eskalasi darurat jika cluster primary mengalami downtime.',
    'd0000000-0000-0000-0000-00000000000d', -- Sagung (Tech Ops)
    'medium', 'normal', null, null, '2026-11-20',
    'd0000000-0000-0000-0000-00000000000b'
  ),
  (
    '70000000-0000-0000-0000-000000000016',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0003-000000000001', -- To Do
    'Optimasi Konfigurasi PgBouncer Connection Pooling',
    'Sesuaikan pool size dan reserve pool pada koneksi serverless Next.js edge functions agar tidak kehabisan client slots.',
    'd0000000-0000-0000-0000-00000000000e', -- Eka Januartati (Tech Ops)
    'medium', 'normal', null, null, '2026-11-10',
    'd0000000-0000-0000-0000-00000000000b'
  ),

  -- ===================================================================
  -- PROJECT 4: DevSecOps & Zero-Trust Security Pipeline (Sentinel)
  -- ===================================================================
  (
    '70000000-0000-0000-0000-000000000017',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0004-000000000002', -- In Progress
    'Implementasi Automated CI/CD Pipeline dengan Rollback Aman',
    'Workflow GitHub Actions untuk build Turbopack, linter check, type checking, dan auto-rollback jika healthcheck gagal.',
    'd0000000-0000-0000-0000-00000000000c', -- Gita (Tech-Ops Manager)
    'critical', 'normal', null, 'cicd/auto-rollback', '2026-10-16',
    'd0000000-0000-0000-0000-00000000000c'
  ),
  (
    '70000000-0000-0000-0000-000000000018',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0004-000000000003', -- Review
    'Audit Kebijakan Row Level Security (RLS) PostgreSQL',
    'Verifikasi seluruh tabel untuk memastikan member hanya bisa mengakses data timnya sendiri dan tidak terjadi data leak.',
    'd0000000-0000-0000-0000-00000000000f', -- Dwita (Tech Ops)
    'critical', 'normal', null, 'sec/rls-hardening', '2026-10-11',
    'd0000000-0000-0000-0000-00000000000c'
  ),
  (
    '70000000-0000-0000-0000-000000000019',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0004-000000000004', -- Done
    'Integrasi Trivy Container & Dependency Vulnerability Scanning',
    'Pemindaian otomatis setiap pull request untuk mendeteksi CVE library berisiko tinggi dan paket usang.',
    'd0000000-0000-0000-0000-00000000000f', -- Dwita (Tech Ops)
    'high', 'normal', null, 'sec/trivy-scanner', '2026-10-09',
    'd0000000-0000-0000-0000-00000000000c'
  ),
  (
    '70000000-0000-0000-0000-00000000001a',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0004-000000000001', -- To Do
    'Manajemen Secret Vault & Otomasi Rotasi Kunci Enkripsi',
    'Penyimpanan rahasia API key eksternal di vault terenkripsi dengan rotasi token berkala tiap 90 hari.',
    'd0000000-0000-0000-0000-00000000000c', -- Gita (Tech-Ops Manager)
    'high', 'normal', null, null, '2026-11-15',
    'd0000000-0000-0000-0000-00000000000c'
  ),
  (
    '70000000-0000-0000-0000-00000000001b',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0004-000000000001', -- To Do
    'Penerapan Content Security Policy (CSP) & CORS Strict Headers',
    'Konfigurasi header HTTP security pada response Next.js untuk mencegah potensi XSS dan clickjacking.',
    'd0000000-0000-0000-0000-00000000000e', -- Eka Januartati (Tech Ops)
    'medium', 'normal', null, null, '2026-11-25',
    'd0000000-0000-0000-0000-00000000000c'
  ),

  -- ===================================================================
  -- PROJECT 5: Workflow Automation & AI Assistant (Aegis / Innovation)
  -- ===================================================================
  (
    '70000000-0000-0000-0000-00000000001c',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0005-000000000002', -- In Progress
    'Riset & Pemodelan Auto-Assignee Berbasis Workload Realtime',
    'Algoritma pemberi rekomendasi PIC task baru secara proporsional kepada anggota tim dengan utilisasi paling rendah.',
    'd0000000-0000-0000-0000-000000000003', -- Prayudi (Tech Principal)
    'high', 'normal', null, 'ai/auto-assignee-research', '2026-11-18',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000001d',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0005-000000000001', -- To Do
    'Integrasi AI Summarizer untuk Diskusi Thread Task yang Panjang',
    'Fitur ringkasan sekali klik menggunakan prompt teroptimasi untuk merangkum update penting dari puluhan komentar task.',
    'd0000000-0000-0000-0000-000000000008', -- Palguna (Software Engineer)
    'medium', 'normal', null, null, '2026-12-05',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000001e',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0005-000000000001', -- To Do
    'Auto-Classification Tiket Masuk Berdasarkan Tingkat Urgensi',
    'Pendeteksi otomatis kata kunci komplain CS untuk menetapkan flag origin "cs_complaint" dan priority "critical".',
    'd0000000-0000-0000-0000-000000000007', -- Budhi (Software Engineer)
    'medium', 'normal', null, null, '2026-12-15',
    'd0000000-0000-0000-0000-000000000003'
  ),
  (
    '70000000-0000-0000-0000-00000000001f',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0005-000000000001', -- To Do
    'Evaluasi Kepatuhan SLA Penyelesaian Task Berbasis Historis',
    'Model prediktif penghitung estimasi tanggal selesai aktual dibanding target due date kartu.',
    'd0000000-0000-0000-0000-000000000002', -- Wira (Tech Specialist)
    'low', 'normal', null, null, '2026-12-20',
    'd0000000-0000-0000-0000-000000000003'
  )
on conflict (id) do nothing;


-- =====================================================================
-- STEP 5.1: Sync Dual-Assignee & Seed Testing Subtasks Checklist
-- =====================================================================
update public.tasks
set developer_id = assignee_id
where developer_id is null and assignee_id is not null;

-- Set tester assignments (Ops / QA testers)
update public.tasks
set tester_id = 'd0000000-0000-0000-0000-00000000000c' -- Gita (QA / Tech Ops Manager)
where project_id = 'b0000000-0000-0000-0000-000000000001' and tester_id is null;

update public.tasks
set tester_id = 'd0000000-0000-0000-0000-00000000000d' -- Sagung (QA / Tech Ops)
where project_id = 'b0000000-0000-0000-0000-000000000002' and tester_id is null;

update public.tasks
set tester_id = 'd0000000-0000-0000-0000-000000000004' -- Detut (Tech Lead)
where project_id in ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004') and tester_id is null;

insert into public.task_subtasks (id, task_id, title, is_completed, tested_by, tested_at, sort_order) values
  -- Bug CS Urgent (#2): Sesi Terputus
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000002', 'Reproduce bug auto-logout di Safari Mobile', true, 'd0000000-0000-0000-0000-00000000000c', now() - interval '3 hours', 0),
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000002', 'Verifikasi fix middleware refresh token cookie', true, 'd0000000-0000-0000-0000-00000000000c', now() - interval '1 hour', 1),
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000002', 'Regression test tab switching 5 menit idle', false, null, null, 2),

  -- Kanban DnD (#1): Drag and Drop
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'Uji drag kartu antar kolom To Do ke In Progress', true, 'd0000000-0000-0000-0000-00000000000c', now() - interval '5 hours', 0),
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'Uji rollback UI jika koneksi offline atau gagal', false, null, null, 1),

  -- Read Replica (#17): PostgreSQL Multi-AZ
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000011', 'Verifikasi latency koneksi port 5433 < 15ms', true, 'd0000000-0000-0000-0000-000000000004', now() - interval '1 day', 0),
  (gen_random_uuid(), '70000000-0000-0000-0000-000000000011', 'Simulasi failover primary ke replica', false, null, null, 1)
on conflict (id) do nothing;

-- ===================
-- STEP 6: Discussion Comments (Thread percakapan realistik)
-- ===================
insert into task_comments (id, task_id, author_id, content, created_at) values
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000002', -- Bug auto logout
    'd0000000-0000-0000-0000-000000000004', -- Detut
    'Laporan dari tim CS pagi ini menyebutkan ada 3 user yang logout sendiri pas navigasi dari Kanban ke Dashboard.',
    '2026-09-30 08:30:00+08'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000005', -- Widiarta
    'Sudah saya investigasi bli Detut. Masalahnya di token refresh cookie handler middleware Next.js yang ter-override saat route transition. Sedang saya push hotfix-nya.',
    '2026-09-30 09:15:00+08'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000001', -- Kanban drag & drop
    'd0000000-0000-0000-0000-000000000008', -- Palguna
    'Drag & drop antar kolom sudah saya tambahkan optimistic state, jadi saat ditarik kartu langsung pindah seketika di UI sebelum mutasi Supabase selesai.',
    '2026-09-30 11:20:00+08'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000004', -- Detut
    'Mantap Palguna! Pastikan juga ada rollback logic jika terjadi error network ya.',
    '2026-09-30 11:45:00+08'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000011', -- Read Replica
    'd0000000-0000-0000-0000-00000000000b', -- Eka Mahendra
    'Koneksi read replica sudah aktif di port 5433. Tinggal konfigurasi pooling di app router.',
    '2026-09-30 10:00:00+08'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000011',
    'd0000000-0000-0000-0000-00000000000d', -- Sagung
    'Siap Bli Eka, dashboard monitoring Prometheus juga sudah mulai merekam IOPS read replica-nya.',
    '2026-09-30 10:30:00+08'
  )
on conflict (id) do nothing;

-- ===================
-- STEP 7: Task Dependencies (Blocked by relations)
-- ===================
insert into task_dependencies (id, task_id, depends_on_task_id) values
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000005', -- Attachment upload
    '70000000-0000-0000-0000-000000000003'  -- Depends on Task Detail
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-00000000000e', -- Redis Cache
    '70000000-0000-0000-0000-00000000000a'  -- Depends on Workload Engine
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000015', -- Runbook DR
    '70000000-0000-0000-0000-000000000011'  -- Depends on Read Replica Setup
  )
on conflict (task_id, depends_on_task_id) do nothing;

-- ===================
-- STEP 8: Activity Log Audit Trail
-- ===================
insert into activity_log (id, task_id, actor_id, field_name, old_value, new_value, created_at) values
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000004',
    'priority',
    'medium',
    'critical',
    now() - interval '2 hours'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000008',
    'column_id',
    'c0000000-0000-0000-0001-000000000001',
    'c0000000-0000-0000-0001-000000000002',
    now() - interval '4 hours'
  ),
  (
    gen_random_uuid(),
    '70000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000009',
    'column_id',
    'c0000000-0000-0000-0001-000000000002',
    'c0000000-0000-0000-0001-000000000003',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================
select 'teams' as tabel, count(*) as jumlah from teams
union all
select 'auth.users', count(*) from auth.users
union all
select 'profiles', count(*) from profiles
union all
select 'capacity_settings', count(*) from capacity_settings
union all
select 'milestones', count(*) from milestones
union all
select 'projects', count(*) from projects
union all
select 'board_columns', count(*) from board_columns
union all
select 'tasks', count(*) from tasks
union all
select 'task_subtasks', count(*) from task_subtasks
union all
select 'task_comments', count(*) from task_comments
union all
select 'task_dependencies', count(*) from task_dependencies
union all
select 'activity_log', count(*) from activity_log;

select 
  p.full_name,
  p.phone,
  p.role,
  coalesce(t.name, 'TIDAK ADA TIM') as tim
from profiles p
left join teams t on t.id = p.team_id
order by t.name nulls last, p.role asc, p.full_name asc;
