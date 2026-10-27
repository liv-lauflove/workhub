# Folder Structure & Architecture

Dokumen ini menjelaskan struktur direktori dan arsitektur aplikasi **Workhub (Task & Performance Dashboard)** yang dibangun di atas **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, dan **Supabase**.

---

## 1. Filosofi Arsitektur: Feature-Sliced Design (Lite)

Untuk menjaga skalabilitas codebase yang memiliki 12 domain bisnis berbeda, Workhub menggunakan pola **Feature-Sliced Design (Lite)**:

1. **`src/app/` (Routing & Presentation Shell):** Hanya berisi konfigurasi routing App Router (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, dan `route.ts`). File `page.tsx` bertugas mengambil data awal di sisi server (Server Component) lalu meneruskannya ke komponen fitur di `src/features/`.
2. **`src/features/` (Domain Modules):** Setiap fitur bisnis memiliki folder mandiri yang berisi `components/`, `actions/`, `queries/` (atau `lib/`), `hooks/`, dan `schemas/`.
3. **`src/components/` (Shared UI):** Komponen UI generik yang dapat dipakai lintas fitur (Shadcn UI primitives di `ui/`, layout navigasi di `layout/`, dan provider global di `providers/`).
4. **`src/lib/` (Core Infrastructure):** Inisialisasi client Supabase (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`), helper umum, dan konstanta sistem.

---

## 2. Pohon Direktori Lengkap (`src/`)

```text
workhub/
├── docs/                                  # Dokumentasi teknis, PRD, ERD, dan standar engineering
├── scripts/                               # Skrip utilitas verifikasi & E2E testing (tsx)
├── supabase/
│   └── migrations/                        # 17 file migrasi SQL berurutan (DDL, Triggers, RLS, Storage)
├── src/
│   ├── app/                               # Next.js 16 App Router
│   │   ├── (auth)/                        # Route group publik (tanpa Sidebar)
│   │   │   ├── login/page.tsx             # Halaman masuk (Email/Password + OAuth Google/GitHub)
│   │   │   ├── register/page.tsx          # Halaman pendaftaran akun baru
│   │   │   └── auth/callback/route.ts     # Endpoint pertukaran kode OAuth Supabase
│   │   ├── (dashboard)/                   # Route group terproteksi (dilengkapi Sidebar, Header, & AI Widget)
│   │   │   ├── page.tsx                   # Executive Performance Dashboard (KPI, Charts, AI Warning, Export)
│   │   │   ├── milestones/
│   │   │   │   ├── page.tsx               # Daftar Milestone lintas tim + filter status & arsip
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx           # Detail Milestone
│   │   │   │       └── projects/page.tsx  # Daftar Project di bawah Milestone tertentu
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx               # Direktori seluruh Project lintas tim
│   │   │   │   └── [id]/page.tsx          # Detail Project + Interactive Kanban Board
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx               # Global Task Directory (pencarian & filter lintas project)
│   │   │   │   └── [id]/page.tsx          # Halaman penuh Detail Task
│   │   │   ├── team/page.tsx              # Direktori Member & Tim (menu "Member": Grid Tim + Tabel Member)
│   │   │   ├── workload/page.tsx          # Analisis beban kerja & kapasitas anggota tim
│   │   │   └── settings/page.tsx          # Pengaturan profil pengguna & informasi akun
│   │   ├── api/                           # Route Handlers (REST Endpoints & Webhooks)
│   │   │   ├── ai/chat/route.ts           # Endpoint utama AI Assistant (RAG + Gemini + Query Cache)
│   │   │   ├── ai-chat/route.ts           # Endpoint kompatibilitas AI Chat
│   │   │   ├── auth/session/route.ts      # Pemeriksaan sesi aktif
│   │   │   ├── dashboard/export/route.ts  # Generator laporan performa CSV / HTML Print-to-PDF
│   │   │   ├── github-webhook/route.ts    # Receiver webhook push GitHub (HMAC SHA-256 + Multi-Repo filter)
│   │   │   └── health/route.ts            # Endpoint health check infrastruktur
│   │   ├── layout.tsx                     # Root Layout (Font Geist, TooltipProvider, Toaster Sonner)
│   │   └── globals.css                    # Konfigurasi Tailwind CSS v4 & variabel tema
│   │
│   ├── components/                        # Shared Components lintas fitur
│   │   ├── ui/                            # Shadcn UI Primitives (Button, Dialog, Sheet, Select, Tabs, dll.)
│   │   ├── layout/                        # AppSidebar, Header, Breadcrumb, NotificationBell
│   │   └── providers/                     # Context Providers
│   │
│   ├── features/                          # 12 Modul Domain Bisnis
│   │   ├── ai/                            # AI Assistant, Auto-Prioritization, Quarterly Warning, & RAG
│   │   │   ├── actions/                   # Server Actions saran prioritas & pencatatan override leader
│   │   │   ├── components/                # Floating AI Chat Widget & Quarterly Warning Banner
│   │   │   ├── lib/                       # Klien Gemini & helper AI
│   │   │   └── rag/                       # Pipeline Retrieval-Augmented Generation (Context Builder)
│   │   ├── auth/                          # Autentikasi & Otorisasi
│   │   │   ├── actions/                   # Login, Register, Logout Server Actions
│   │   │   └── components/                # LoginForm, RegisterForm, OAuth Buttons
│   │   ├── dashboard/                     # Executive Performance Dashboard
│   │   │   ├── components/                # SummaryCards, MonthlyTrendChart, TeamBreakdown, ExportButton
│   │   │   └── queries/                   # Agregasi KPI kuartalan, bulanan, dan distribusi status
│   │   ├── github/                        # Integrasi GitHub & Webhook Processing
│   │   │   ├── actions/                   # Tautkan branch & repository (`owner/repo`) ke Task
│   │   │   ├── components/                # GithubBranchSection, GithubCommitsList
│   │   │   └── lib/                       # Webhook signature verifier, parser, & handler multi-repo
│   │   ├── kanban/                        # Papan Kanban Interaktif (@dnd-kit)
│   │   │   ├── actions/                   # Reorder kolom, pindah kartu Task, CRUD kolom custom
│   │   │   └── components/                # KanbanBoard, KanbanColumn, KanbanCard
│   │   ├── milestones/                    # Manajemen Milestone Strategis
│   │   │   ├── actions/                   # Create, Update, Archive/Restore, Delete Milestone
│   │   │   ├── components/                # MilestoneCard, CreateMilestoneModal, MilestoneFilter
│   │   │   └── schemas/                   # Validasi Zod Milestone
│   │   ├── notifications/                 # Sistem Notifikasi In-App
│   │   │   ├── actions/                   # Mark as read, mark all as read, trigger overload notification
│   │   │   └── components/                # NotificationPopover, NotificationItem
│   │   ├── profile/                       # Pengaturan Profil Pengguna
│   │   │   ├── actions/                   # Update nama, nomor telepon, jabatan, avatar, & GitHub username
│   │   │   └── components/                # ProfileSettingsForm
│   │   ├── projects/                      # Manajemen Project Tim
│   │   │   ├── actions/                   # Create (beserta 4 kolom default), Update, Archive Project
│   │   │   ├── components/                # ProjectCard, CreateProjectModal
│   │   │   └── schemas/                   # Validasi Zod Project
│   │   ├── tasks/                         # Manajemen Task, Dual-Assignee QA, Subtasks, & Kolaborasi
│   │   │   ├── actions/                   # CRUD Task, Subtasks, Comments, Attachments, Dependencies
│   │   │   ├── components/                # TaskDetailSheet, SubtasksList, CommentsThread, ActivityTimeline
│   │   │   └── schemas/                   # Validasi Zod Task & Dual-Assignee (`developer_id`, `tester_id`)
│   │   ├── team/                          # Direktori Member & Manajemen Tim Dinamis
│   │   │   ├── actions/                   # Buat/Edit/Hapus Tim (khusus Management), Invite Member, Ubah Role
│   │   │   └── components/                # TeamDirectoryView (Grid Tim + Drill-down), TeamFormDialog
│   │   └── workload/                      # Kalkulasi Kapasitas & Beban Kerja
│   │       ├── actions/                   # Update baseline capacity tim & poin kapasitas individu
│   │       ├── components/                # WorkloadTable, CapacityProgressBar, OverloadBadge
│   │       └── queries/                   # Perhitungan bobot task aktif (Dev 100% + QA 50%)
│   │
│   ├── lib/                               # Infrastruktur Inti & Utilitas Global
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Browser client (@supabase/ssr createBrowserClient)
│   │   │   ├── server.ts                  # Server Component & Server Action client (createServerClient)
│   │   │   ├── admin.ts                   # Service Role client (khusus Webhook & operasi admin terverifikasi)
│   │   │   └── middleware.ts              # Penyegaran sesi otomatis & proteksi rute
│   │   └── utils.ts                       # Helper classNames (`cn`) dan formatter tanggal/angka
│   │
│   ├── types/                             # Definisi Tipe TypeScript Global
│   │   └── database.types.ts              # Tipe representasi tabel, view, dan enum Supabase Postgres
│   │
│   └── middleware.ts                      # Entrypoint Next.js Middleware
```

---

## 3. Alur Data & Pemisahan Tanggung Jawab

### 3.1 Pembacaan Data (Queries)

- Seluruh halaman di `src/app/(dashboard)/**/page.tsx` adalah **React Server Components (RSC)**.
- Data diambil langsung di server menggunakan `createClient()` dari [`src/lib/supabase/server.ts`](file:///D:/Project/workhub/src/lib/supabase/server.ts) yang meneruskan cookie sesi pengguna sehingga **Row Level Security (RLS)** dieksekusi langsung oleh PostgreSQL.
- Untuk halaman yang membutuhkan filter dinamis (seperti Dashboard Performa per Tim/Kuartal atau Direktori Task), state filter disimpan di URL Search Params (`?team=...&quarter=...`) atau dikelola oleh Client Component interaktif di `src/features/<feature>/components/`.

### 3.2 Mutasi Data (Server Actions)

- Semua operasi tulis (Create, Update, Archive, Delete) menggunakan **Next.js Server Actions** (`'use server'`) yang berada di `src/features/<feature>/actions/`.
- Setiap Server Action wajib:
  1. Memvalidasi payload menggunakan schema **Zod**.
  2. Memverifikasi sesi pengguna (`supabase.auth.getUser()`).
  3. Mengeksekusi query Supabase dan memanggil `revalidatePath()` agar UI Server Component langsung tersinkronisasi tanpa reload manual.
  4. Mengembalikan objek terstruktur `{ success?: boolean, data?: T, error?: string }`.

### 3.3 Integrasi Eksternal (API Routes)

- **GitHub Webhook (`/api/github-webhook`):** Menerima payload push event dari GitHub, memverifikasi signature HMAC SHA-256 (`X-Hub-Signature-256`), mencocokkan nama branch serta `repository.full_name` (`tasks.github_repo`), dan menyimpan riwayat commit ke tabel `github_commits` menggunakan Admin Client.
- **AI Assistant (`/api/ai/chat`):** Mengambil konteks beban kerja, proyek, dan task terkini melalui modul RAG (`src/features/ai/rag/`), memeriksa `ai_query_cache` berbasis SHA-256, dan memanggil model Google Gemini jika belum ada cache yang valid.
