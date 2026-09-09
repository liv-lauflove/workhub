-- =====================================================================
-- Task & Performance Dashboard — Database Seed Data (seed.sql)
-- Issue #11: [Setup] Pembuatan Data Seeder
-- Relational Mock Data: 2 Profiles, 1 Team, 1 Milestone, 2 Projects, 10 Tasks
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Teams & Capacity Settings
-- ---------------------------------------------------------------------
insert into teams (id, name) values
  ('e1111111-1111-1111-1111-111111111111', 'Aegis'),
  ('e2222222-2222-2222-2222-222222222222', 'Sentinel')
on conflict (name) do nothing;

insert into capacity_settings (team_id, baseline_points) values
  ('e1111111-1111-1111-1111-111111111111', 20),
  ('e2222222-2222-2222-2222-222222222222', 20)
on conflict (team_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Auth Users (Supabase auth.users)
-- Passwords set to 'Password123!' (encrypted with bcrypt)
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
  (
    '00000000-0000-0000-0000-000000000000',
    'd1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'leader@workhub.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Kak Rani"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'member@workhub.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bima"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Profiles (Linked to auth.users and teams)
-- ---------------------------------------------------------------------
insert into profiles (id, full_name, role, team_id, github_username, avatar_url) values
  (
    'd1111111-1111-1111-1111-111111111111',
    'Kak Rani',
    'leader',
    'e1111111-1111-1111-1111-111111111111',
    'kak-rani',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Rani'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'Bima',
    'member',
    'e1111111-1111-1111-1111-111111111111',
    'bima-sentinel',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bima'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Milestones
-- ---------------------------------------------------------------------
insert into milestones (
  id,
  title,
  description,
  pic_id,
  start_date,
  target_date,
  status,
  created_by
) values (
  'f1111111-1111-1111-1111-111111111111',
  'Q1 2026 Core Platform Delivery',
  'Peluncuran fondasi Workhub Task & Performance Dashboard untuk Tim Aegis dan Sentinel.',
  'd1111111-1111-1111-1111-111111111111',
  '2026-01-01',
  '2026-03-31',
  'in_progress',
  'd1111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 5. Projects
-- ---------------------------------------------------------------------
insert into projects (
  id,
  milestone_id,
  team_id,
  name,
  description,
  pic_id,
  status,
  created_by
) values
  (
    'b1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'Workhub Web App MVP',
    'Pengembangan dashboard antarmuka Next.js App Router, Kanban board, dan integrasi Supabase.',
    'd1111111-1111-1111-1111-111111111111',
    'in_progress',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'API & Performance Analytics',
    'Layanan kalkulasi beban kerja tim (workload), metrik performa kuartalan, dan ekspor laporan.',
    'd1111111-1111-1111-1111-111111111111',
    'planned',
    'd1111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. Board Columns (Kanban columns per project)
-- ---------------------------------------------------------------------
-- Columns for Project 1: Workhub Web App MVP
insert into board_columns (id, project_id, name, position, is_default) values
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'To Do', 0, true),
  ('c1111111-1111-1111-1111-111111111112', 'b1111111-1111-1111-1111-111111111111', 'In Progress', 1, false),
  ('c1111111-1111-1111-1111-111111111113', 'b1111111-1111-1111-1111-111111111111', 'Review', 2, false),
  ('c1111111-1111-1111-1111-111111111114', 'b1111111-1111-1111-1111-111111111111', 'Done', 3, false)
on conflict (id) do nothing;

-- Columns for Project 2: API & Performance Analytics
insert into board_columns (id, project_id, name, position, is_default) values
  ('c2222222-2222-2222-2222-222222222221', 'b2222222-2222-2222-2222-222222222222', 'To Do', 0, true),
  ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'In Progress', 1, false),
  ('c2222222-2222-2222-2222-222222222223', 'b2222222-2222-2222-2222-222222222222', 'Review', 2, false),
  ('c2222222-2222-2222-2222-222222222224', 'b2222222-2222-2222-2222-222222222222', 'Done', 3, false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 7. Tasks (10 Tasks across projects and columns)
-- ---------------------------------------------------------------------
insert into tasks (
  id,
  project_id,
  column_id,
  title,
  description,
  assignee_id,
  priority,
  origin,
  origin_note,
  github_branch,
  due_date,
  created_by
) values
  -- Project 1 Tasks
  (
    '71111111-1111-1111-1111-111111111101',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111114', -- Done
    'Setup Supabase Cloud Authentication Flow',
    'Integrasi Supabase Auth dengan email & OAuth, manajemen session token, dan cookies handler.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'high',
    'normal',
    null,
    'feat/auth-setup',
    '2026-01-20',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111102',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111114', -- Done
    'Konfigurasi CI/CD Pipeline & GitHub Action',
    'Setup otomatisasi QA: ESLint, TypeScript check, dan build verification pada pull request.',
    'd1111111-1111-1111-1111-111111111111', -- Kak Rani
    'medium',
    'normal',
    null,
    'infra/cicd-setup',
    '2026-01-25',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111103',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111112', -- In Progress
    'Implementasi Drag-and-Drop Kanban Board',
    'Membangun interaksi drag-and-drop antar kolom Kanban dengan optimistic UI update.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'critical',
    'normal',
    null,
    'feat/kanban-dnd',
    '2026-02-15',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111104',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111112', -- In Progress
    '[CS Urgent] Sesi login terputus saat navigasi antar route',
    'Bug laporan CS tiket #4921: Pengguna mengalami auto-logout saat membuka rute dashboard.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'critical',
    'cs_complaint',
    'Tiket #4921 dilaporkan oleh CS Hotline internal pada 2026-02-01.',
    'fix/session-refresh',
    '2026-02-05',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111105',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111114', -- Done
    'Pembuatan Komponen Layout Sidebar & Header Navigasi',
    'Komponen navigasi responsif, user avatar dropdown, dan menu switcher per role.',
    'd1111111-1111-1111-1111-111111111111', -- Kak Rani
    'medium',
    'normal',
    null,
    'feat/layout-navigation',
    '2026-01-30',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111106',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111', -- To Do
    'Desain Halaman Detail Task & Activity Log Thread',
    'Menampilkan metadata lengkap task, history pergerakan status, dan thread diskusi.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'medium',
    'normal',
    null,
    null,
    '2026-02-28',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111107',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111', -- To Do
    'Implementasi Attachment File Upload ke Supabase Storage',
    'Dukungan lampiran gambar dan dokumen pendukung pada kartu task dengan validasi ukuran file.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'low',
    'normal',
    null,
    null,
    '2026-03-10',
    'd1111111-1111-1111-1111-111111111111'
  ),
  -- Project 2 Tasks
  (
    '71111111-1111-1111-1111-111111111108',
    'b2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222', -- In Progress
    'Engine Kalkulasi Workload & Kapasitas Anggota Tim',
    'Formula: sum(bobot task aktif) / baseline_points * 100 dengan indikator visual overload (>80%).',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'high',
    'normal',
    null,
    'feat/workload-engine',
    '2026-03-05',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111109',
    'b2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222221', -- To Do
    'Filter Kuartalan & Pembuatan Query Performa Town Hall',
    'Dashboard filter tahun/kuartal dan tren penyelesaian bulanan untuk persiapan materi Town Hall.',
    'd1111111-1111-1111-1111-111111111111', -- Kak Rani
    'high',
    'normal',
    null,
    null,
    '2026-03-15',
    'd1111111-1111-1111-1111-111111111111'
  ),
  (
    '71111111-1111-1111-1111-111111111110',
    'b2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222221', -- To Do
    'Ekspor Laporan Dashboard ke Format Excel & PDF',
    'Fitur export ringkasan performa dan tabel workload ke format file cetak.',
    'd2222222-2222-2222-2222-222222222222', -- Bima
    'medium',
    'normal',
    null,
    null,
    '2026-03-25',
    'd1111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Sample Discussion Comments & Dependencies
-- ---------------------------------------------------------------------
insert into task_comments (task_id, author_id, content) values
  (
    '71111111-1111-1111-1111-111111111104',
    'd1111111-1111-1111-1111-111111111111',
    'Mohon diprioritaskan ya Bima, banyak keluhan CS saat login ulang.'
  ),
  (
    '71111111-1111-1111-1111-111111111104',
    'd2222222-2222-2222-2222-222222222222',
    'Siap Kak, sedang saya telusuri helper updateSession di middleware.'
  )
on conflict (id) do nothing;

insert into task_dependencies (task_id, depends_on_task_id) values
  (
    '71111111-1111-1111-1111-111111111107', -- Task 7 (Attachment Upload)
    '71111111-1111-1111-1111-111111111106'  -- depends on Task 6 (Task Detail)
  )
on conflict (task_id, depends_on_task_id) do nothing;

insert into activity_log (task_id, actor_id, field_name, old_value, new_value) values
  (
    '71111111-1111-1111-1111-111111111104',
    'd1111111-1111-1111-1111-111111111111',
    'priority',
    'medium',
    'critical'
  ),
  (
    '71111111-1111-1111-1111-111111111103',
    'd2222222-2222-2222-2222-222222222222',
    'column_id',
    'c1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111112'
  )
on conflict (id) do nothing;
