# Folder Structure & Clean Architecture

Aplikasi Workhub (Task & Performance Dashboard) dibangun menggunakan kerangka kerja **Next.js (App Router)** dan **Supabase Cloud**. Arsitektur ini dirancang menggunakan prinsip **Clean Architecture & Feature-Driven Modular Design** agar dapat terus dikembangkan secara bertahap (40+ GitHub issues across 4 phases) tanpa membutuhkan refactoring besar-besaran di masa mendatang.

---

## 1. Prinsip Utama Arsitektur

| Prinsip                                      | Implementasi                                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature-based Modules**                    | Seluruh logika bisnis, actions, queries, types, dan komponen fitur dikelompokkan dalam domain modul di `src/features/`.                                                                                   |
| **Server-First (RSC)**                       | Komponen secara _default_ adalah Server Component. Direktif `"use client"` hanya ditempatkan pada komponen interaktif paling bawah (leaf level: form submission, drag-and-drop Kanban, chart interaktif). |
| **Colocation**                               | Komponen dan utilitas yang hanya dipakai oleh satu fitur ditaruh di dalam folder fitur tersebut.                                                                                                          |
| **Separation of Concerns**                   | Routing (`src/app/`), UI murni (`src/components/`), Business Domain (`src/features/`), dan Core Utilities/Infra (`src/lib/`, `src/config/`) terpisah tegas.                                               |
| **Strict Type Safety & Boundary Validation** | Menggunakan tipe database hasil _generate_ Supabase CLI (`src/types/database.types.ts`) dan validasi _runtime_ menggunakan schema **Zod** sebelum mutasi database.                                        |

---

## 2. Struktur Direktori Lengkap (`src/`)

```
src/
├── app/                              # Next.js App Router (Hanya untuk Routing & Layouts)
│   ├── (auth)/                       # Route Group: Autentikasi (Layout terisolasi tanpa sidebar)
│   │   ├── login/page.tsx            # Halaman Login
│   │   ├── register/page.tsx         # Halaman Registrasi
│   │   ├── auth/callback/route.ts    # OAuth Code Exchange handler
│   │   └── layout.tsx                # Auth layout (centered card)
│   │
│   ├── (dashboard)/                  # Route Group: Dashboard Utama (Layout dengan Sidebar & Header)
│   │   ├── layout.tsx                # Dashboard persistent layout
│   │   ├── page.tsx                  # Dashboard Home (/)
│   │   ├── milestones/
│   │   │   ├── page.tsx              # Listing Milestones
│   │   │   └── [id]/page.tsx         # Milestone Detail & Project List
│   │   ├── projects/
│   │   │   └── [id]/page.tsx         # Project Detail & Kanban Board
│   │   ├── tasks/
│   │   │   └── [id]/page.tsx         # Task Detail, Comments, Git History
│   │   ├── team/page.tsx             # Manajemen Tim & Anggota
│   │   ├── workload/page.tsx         # Perhitungan Beban & Kapasitas Tim
│   │   ├── settings/page.tsx         # Profil & Integrasi Pengguna
│   │   ├── notifications/page.tsx    # Pusat Notifikasi
│   │   └── archive/page.tsx          # Arsip Milestone & Project
│   │
│   ├── api/                          # Route Handlers (Webhook luar, e.g., GitHub webhooks)
│   ├── layout.tsx                    # Root Layout aplikasi (HTML, Body, Theme, Global Fonts)
│   ├── not-found.tsx                 # Global 404 handler
│   ├── error.tsx                     # Global error boundary
│   └── globals.css                   # Tailwind v4 & OKLCH Theme Variables
│
├── components/                       # Komponen UI Global / Shared
│   ├── layout/                       # Komponen struktural layout (Header, Sidebar, MobileNav)
│   ├── ui/                           # Atom UI (Button, Card, Dialog, Input - shadcn/ui)
│   ├── forms/                        # Komponen form pembantu (SubmitButton dengan status pending)
│   └── providers/                    # React Context Providers (Theme, Toast, dll)
│
├── features/                         # 🔑 Domain Business Modules
│   ├── auth/                         # Modul Autentikasi & Profil (US-01, US-02)
│   │   ├── actions/auth.actions.ts   # Server Actions ('use server')
│   │   ├── queries/auth.queries.ts   # Server Queries ('server-only')
│   │   └── lib/auth.utils.ts         # requireAuth helper
│   │
│   ├── milestones/                   # Modul Milestone (US-03, US-04)
│   │   ├── actions/milestone.actions.ts
│   │   ├── queries/milestone.queries.ts
│   │   └── types/milestone.types.ts
│   │
│   ├── projects/                     # Modul Project (US-05)
│   │   ├── actions/project.actions.ts
│   │   ├── queries/project.queries.ts
│   │   └── types/project.types.ts
│   │
│   ├── tasks/                        # Modul Task, Komentar, & Dependency (US-06, US-09, US-26)
│   │   ├── actions/task.actions.ts
│   │   ├── queries/task.queries.ts
│   │   └── types/task.types.ts
│   │
│   ├── kanban/                       # Modul Kanban Board Drag-and-Drop (US-07, US-08)
│   │   ├── actions/kanban.actions.ts
│   │   └── types/kanban.types.ts
│   │
│   ├── dashboard/                    # Modul Analitik & Laporan Kuartalan (US-10, US-11, US-27)
│   │   ├── queries/dashboard.queries.ts
│   │   └── types/dashboard.types.ts
│   │
│   ├── workload/                     # Modul Pelacakan Kapasitas & Overload (US-12)
│   │   ├── queries/workload.queries.ts
│   │   └── lib/capacity.utils.ts     # Formula kalkulasi kapasitas
│   │
│   ├── team/                         # Modul Tim & Undangan (US-22, US-23)
│   │   ├── actions/team.actions.ts
│   │   └── queries/team.queries.ts
│   │
│   ├── notifications/                # Modul Notifikasi In-App & Activity Log (US-19, US-20, US-21)
│   │   ├── actions/notification.actions.ts
│   │   └── queries/notification.queries.ts
│   │
│   ├── github/                       # Modul Integrasi GitHub API & Commits (Phase 3: US-13, US-14)
│   │   ├── actions/github.actions.ts
│   │   ├── queries/github.queries.ts
│   │   └── lib/github-api.ts
│   │
│   └── ai/                           # Modul AI Chatbot & Caching (Phase 4: US-15, US-16, US-18, US-28)
│       ├── actions/ai.actions.ts
│       ├── queries/ai-cache.queries.ts
│       └── lib/
│           ├── llm-client.ts
│           └── prompt-templates.ts
│
├── config/                           # Konfigurasi Aplikasi & Konstanta
│   ├── site.ts                       # Metadatata aplikasi & Nav Items
│   ├── routes.ts                     # Type-safe routing dictionary (ROUTES)
│   └── feature-flags.ts              # Feature flags untuk rilis bertahap (AI, GitHub)
│
├── hooks/                            # Custom React Hooks
│   ├── use-user.ts                   # Hook pembaca sesi auth client-side
│   ├── use-debounce.ts               # Hook debounce input pencarian
│   └── use-media-query.ts            # Hook responsif breakpoint
│
├── lib/                              # Utilitas Dasar & Klien Eksternal
│   ├── supabase/                     # Setup Supabase Cloud SSR
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   ├── server.ts                 # Server client (createServerClient via cookies())
│   │   └── middleware.ts             # Session refresh helper
│   ├── validations/                  # Skema validasi Zod bersama
│   │   └── common.ts                 # Pagination, UUID, dateRange schema
│   ├── constants.ts                  # Konstanta aplikasi (Thresholds, File Limits)
│   └── utils.ts                      # Utilitas umum (cn)
│
├── types/                            # Type Definitions Global
│   ├── database.types.ts             # Auto-generated Supabase database types (17 tables)
│   └── global.d.ts                   # Type umum (ActionState, PaginationParams)
│
└── middleware.ts                     # Next.js Edge Middleware untuk session refresh Supabase
```

---

## 3. Pola Komponen & Pemisahan Boundaries

### Server Components vs Client Components

- Halaman (`page.tsx`) dan tata letak (`layout.tsx`) **wajib menjadi Server Components** secara default.
- Data di-fetch langsung di sisi server menggunakan _query functions_ dari `src/features/[feature]/queries/`.
- Jangan menandai seluruh `page.tsx` dengan `"use client"`. Gunakan pola komposisi:
  ```tsx
  // src/app/(dashboard)/milestones/page.tsx (Server Component)
  import { getMilestones } from '@/features/milestones/queries/milestone.queries';
  import { MilestoneList } from '@/features/milestones/components/milestone-list';

  export default async function MilestonesPage() {
    const milestones = await getMilestones();
    return <MilestoneList milestones={milestones} />;
  }
  ```

### Isolasi Server Code (`server-only`)

- Semua file query database di `queries/` wajib mengimpor `import 'server-only'`. Ini memastikan kode query dan kredensial database tidak sengaja ter-bundle atau bocor ke client-side.

### Mutasi Data via Server Actions

- Mutasi dilakukan melalui fungsi di `actions/*.actions.ts` dengan direktif `'use server'`.
- Validasi input di sisi server selalu dijalankan menggunakan **Zod schema** sebelum query dieksekusi.
- Setelah mutasi berhasil, perbarui cache via `revalidatePath()` dan arahkan halaman dengan `redirect()`.

---

## 4. Keamanan & Proteksi Sesi

1. **Middleware (`src/middleware.ts`)**:
   - Menjalankan `updateSession` dari `@/lib/supabase/middleware` pada setiap request rute dinamis untuk menyegarkan token autentikasi yang kedaluwarsa sebelum halaman dirender.
2. **Row Level Security (RLS)**:
   - Database Supabase menerapkan RLS ketat berdasarkan `role` di tabel `profiles`. Hak akses Leader vs Member di-enforce di level basis data, bukan hanya disembunyikan di antarmuka (UI).
3. **Feature Flags (`src/config/feature-flags.ts`)**:
   - Fitur-fitur eksperimental atau integrasi eksternal (AI LLM, GitHub OAuth) dilindungi oleh flag sehingga dapat dimatikan seketika tanpa perlu deploy ulang jika terjadi kendala rate limit atau anomali biaya.
