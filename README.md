# Workhub: Task & Performance Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Workhub** adalah aplikasi web internal manajemen tugas, beban kerja (_workload_), dan pelaporan performa tim rekayasa perangkat lunak (_software engineering_). Aplikasi ini menyatukan hierarki **Milestone -> Project -> Task**, papan Kanban _drag-and-drop_, alur pengujian QA (_dual-assignee_), integrasi _webhook_ multi-repositori GitHub, serta asisten AI berbasis RAG dalam satu antarmuka terpusat.

---

## Fitur Utama

### 1. Hierarki Kerja Terstruktur (Milestone -> Project -> Task)

- Milestones mencatat target strategis lintas tim dengan penanggung jawab (PIC), rentang tanggal mulai/target, indikator risiko, dan pengarsipan (_archive_).
- Projects mengelompokkan pekerjaan per tim (_squad_) yang berkontribusi pada satu Milestone, dilengkapi pengaturan kolom Kanban khusus per proyek.
- Tasks menjadi unit kerja terkecil dengan prioritas (`critical`, `high`, `medium`, `low`), pelacakan asal tugas (`normal` atau `cs_complaint` dari keluhan Customer Service), lampiran berkas, komentar diskusi, dan ketergantungan (_blocking dependencies_).

### 2. Alur Kerja Developer & QA (Dual-Assignee)

- Setiap task mendukung penugasan terpisah untuk **Developer** (`developer_id`) dan **Tester / QA** (`tester_id`).
- Pelacakan status dua jalur: `dev_status` (`todo`, `in_progress`, `dev_done`) dan `test_status` (`pending`, `testing`, `passed`, `failed`) beserta catatan pengujian (`test_notes`).
- Daftar periksa pengujian interaktif (**Subtask Testing Checklist**) yang mencatat siapa yang menguji tiap butir dan waktu penyelesaiannya.

### 3. Papan Kanban Interaktif

- Pemindahan kartu antar kolom menggunakan `@dnd-kit` dengan pembaruan optimistik.
- Penanda visual otomatis untuk task yang terblokir oleh task lain (_dependency_), melewati tenggat waktu (_overdue_), atau berasal dari eskalasi CS.
- Setiap perpindahan status, perubahan prioritas, penugasan, dan penautan kode tercatat otomatis di `activity_log` melalui trigger PostgreSQL.

### 4. Integrasi GitHub Multi-Repository

- Endpoint webhook `/api/github-webhook` dengan verifikasi tanda tangan kriptografis **HMAC-SHA256** (`crypto.timingSafeEqual`).
- Setiap task dapat menautkan **Repository Target** (`github_repo`) dan **Nama Branch** (`github_branch`).
- Isolasi ketat antar-repositori: _push commit_ pada branch bernama sama dari repositori berbeda (misal frontend vs backend) disaring secara presisi agar hanya masuk ke task yang sesuai.

### 5. Kalkulasi Beban Kerja (Workload) & Asisten AI (RAG)

- Perhitungan persentase beban kerja anggota tim secara _real-time_ berdasarkan bobot prioritas task aktif dibandingkan terhadap kapasitas poin individu (`capacity_points`) atau rata-rata tim (`capacity_settings`).
- Deteksi otomatis anggota yang mengalami kelebihan beban (_overload_ > 80% kapasitas).
- **AI Assistant berbasis RAG** (`/api/ai/chat`) yang dilengkapi kamus skema basis data, aturan alur kerja, agregator beban kerja ter-sanitasi, saran prioritas/durasi task, pencatatan _override_ keputusan leader (`ai_suggestion_overrides`), serta cache respons (`ai_query_cache`).

### 6. Direktori Member & Manajemen Tim Dinamis

- Navigasi **Member** dengan tampilan kartu ringkasan per tim (_squad overview_) dan _drill-down_ daftar anggota beserta kapasitas poinnya.
- Sistem undangan anggota via email (`team_invitations`) dengan klaim otomatis saat pengguna mendaftar atau masuk.
- Pembuatan tim baru dan pengubahan nama tim secara dinamis khusus untuk otoritas **Management**, dengan penguncian keamanan pada tim inti `Management`.

### 7. Dashboard Eksekutif & Ekspor Laporan Town Hall

- Ringkasan metrik penyelesaian proyek, distribusi prioritas, tren progres, dan ekspor laporan ke format PDF/CSV melalui `/api/dashboard/export`.

---

## Tumpukan Teknologi (Tech Stack)

| Lapisan                 | Teknologi                                                                             |
| :---------------------- | :------------------------------------------------------------------------------------ |
| **Framework**           | Next.js 16.3.4 (App Router, Turbopack, Server Components, Server Actions)             |
| **Bahasa & UI**         | TypeScript 5, React 19.2, Tailwind CSS v4 (OKLCH Design Tokens), Base UI / shadcn     |
| **Interaksi & Grafik**  | `@dnd-kit/core` & `@dnd-kit/sortable` (Kanban), `recharts` (Analitik), `lucide-react` |
| **Backend & Database**  | Supabase Cloud (PostgreSQL, Row Level Security, Triggers, Supabase Storage)           |
| **Autentikasi**         | `@supabase/ssr` (Email/Password, Google OAuth, GitHub OAuth)                          |
| **Validasi & Kualitas** | Zod v4, ESLint 9, Prettier, Husky + lint-staged                                       |

---

## Memulai Pengembangan (Getting Started)

### 1. Prasyarat

- **Node.js** >= 20.x (direkomendasikan v22 atau v24)
- **pnpm** >= 10.x
- Proyek **Supabase Cloud** aktif

### 2. Instalasi Dependensi

```bash
git clone https://github.com/liv-lauflove/workhub.git
cd workhub
pnpm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)

Buat berkas `.env.local` di direktori akar proyek:

```env
# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# GitHub Integration & Webhook
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GITHUB_WEBHOOK_SECRET=<hmac-sha256-webhook-secret>
```

### 4. Migrasi & Seeding Database

Terapkan seluruh skema migrasi di `supabase/migrations/` ke Supabase Cloud dan jalankan _seeder_ data awal:

```bash
# Terapkan migrasi ke Supabase yang terhubung
npx supabase db push

# Isi data awal (Tim, Profil, Milestone, Project, Kolom Kanban, dan Task)
pnpm db:seed
```

### 5. Menjalankan Server Pengembangan

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di peramban.

---

## Pemeriksaan Kualitas & Skrip Pengujian

Sebelum membuat Pull Request, jalankan pemeriksaan berikut:

```bash
# Pemeriksaan aturan linter ESLint
pnpm lint

# Kompilasi produksi Next.js & pemeriksaan tipe TypeScript
pnpm build

# Pengujian unit & verifikasi fitur
npx tsx scripts/test-github-webhook.ts
npx tsx scripts/test-workload-engine.ts
npx tsx scripts/test-task-prioritizing.ts
npx tsx scripts/test-ai-guardrails.ts
npx tsx scripts/test-ai-rag.ts
```

---

## Dokumentasi Lengkap (`docs/`)

Seluruh dokumentasi arsitektur, basis data, dan alur kerja tersedia di direktori [`docs/`](./docs/README.md):

- [`docs/README.md`](./docs/README.md) memuat peta navigasi seluruh dokumen teknis.
- [`docs/FOLDER_STRUCTURE_AND_ARCHITECTURE.md`](./docs/FOLDER_STRUCTURE_AND_ARCHITECTURE.md) menjelaskan prinsip _Feature-Driven Modular Design_, batasan Server vs Client Component, dan struktur rute.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) merinci 18 tabel PostgreSQL, relasi, _trigger_, dan kebijakan Row Level Security.
- [`docs/diagram.md`](./docs/diagram.md) menyajikan Diagram ERD, Activity Diagram (Task, CS Complaint, QA, Town Hall), dan Use Case Diagram dalam format Mermaid.
- [`docs/schema.sql`](./docs/schema.sql) berisi definisi DDL lengkap tabel, _enum_, _index_, dan _trigger_ PostgreSQL.
- [`docs/prd.md`](./docs/prd.md) memuat spesifikasi kebutuhan fungsional, _user stories_, matriks hak akses, dan metrik keberhasilan.
- [`docs/INFRASTRUCTURE_AND_CICD.md`](./docs/INFRASTRUCTURE_AND_CICD.md) merangkum konfigurasi Supabase Cloud, Storage, GitHub Webhook, dan alur _deployment_.
- [`docs/GITFLOW_AND_CONVENTIONS.md`](./docs/GITFLOW_AND_CONVENTIONS.md) menetapkan standar percabangan Git, _Conventional Commits_, dan format Pull Request.
- [`docs/AI_AGENT_GUIDELINES.md`](./docs/AI_AGENT_GUIDELINES.md) mengatur kerja pasangan pemrograman AI, keamanan RLS, dan protokol QA.
- [`docs/PROJECT_SETUP_CHECKLIST.md`](./docs/PROJECT_SETUP_CHECKLIST.md) mencatat status kesiapan infrastruktur dan fitur aplikasi.

---

## Lisensi

Didistribusikan di bawah **MIT License**. Lihat berkas [`LICENSE`](./LICENSE) untuk informasi selengkapnya.
