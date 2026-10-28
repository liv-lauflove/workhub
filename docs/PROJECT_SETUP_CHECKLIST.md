# Project Setup & Engineering Checklist

Dokumen ini mencatat status kesiapan fondasi teknis, fitur inti, dan penjaga kualitas (_code guardrails_) pada aplikasi **Workhub (Task & Performance Dashboard)**.

---

## 1. Basis Data, Migrasi, & Seeding (Supabase Cloud)

- [x] **Setup Supabase Cloud & Client SDK**: Terhubung ke Supabase Cloud menggunakan `@supabase/ssr` (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`).
- [x] **Sistem Migrasi Terkendali (`supabase/migrations/`)**: Seluruh 17 berkas migrasi dari skema awal, kebijakan RLS, _trigger_ log aktivitas, _dual-assignee_ & _subtasks_, bucket lampiran, kapasitas poin profil, `github_repo` multi-repositori, hingga pembuatan tim dinamis telah diterapkan.
- [x] **Data Seeder (`supabase/seed.sql` & `scripts/seed.mjs`)**: Data organisasi realistis mencakup 3 tim awal (`Aegis`, `Sentinel`, `Management`), 15 profil anggota, Milestone, Project, kolom Kanban, dan Task siap digunakan untuk demonstrasi.

## 2. Sistem Desain & Antarmuka Pengguna (UI/UX)

- [x] **Tailwind CSS v4 & OKLCH Tokens**: Konfigurasi variabel tema terang dan gelap di `src/app/globals.css` dengan kontras terverifikasi WCAG AA.
- [x] **Komponen UI Modular (`src/components/ui/`)**: Komponen tombol, input, dialog, tabel, dropdown, tooltip, dan kartu dibangun di atas primitif aksesibel.
- [x] **Standar Antislop UI**: Hirarki visual bersih, bebas elemen dekoratif tanpa fungsi, navigasi papan ketik (_keyboard accessible_), dan _tap target_ ramah perangkat sentuh.

## 3. Modul Fungsional Inti (Phase 1 s.d. Phase 4)

- [x] **Autentikasi & Otorisasi Berjenjang**: Login email/kata sandi, Google/GitHub OAuth, klaim undangan otomatis, serta pemisahan hak akses **Management**, **Leader**, dan **Member**.
- [x] **Manajemen Tim & Direktori Member**: Tampilan grid kartu tim, _drill-down_ daftar anggota, pengaturan kapasitas poin, serta pembuatan/pengeditan tim baru oleh peran Management.
- [x] **Hierarki Milestone -> Project -> Kanban Task**: CRUD lengkap, pengarsipan, filter lintas tim, serta papan Kanban _drag-and-drop_ (`@dnd-kit`).
- [x] **Alur Kerja Dual-Assignee (Dev & QA)**: Penugasan Developer & Tester terpisah, status dua jalur (`dev_status` & `test_status`), pengajuan review/PR, dan _Subtask Testing Checklist_.
- [x] **Integrasi GitHub Multi-Repository**: Endpoint `/api/github-webhook` berverifikasi HMAC-SHA256, isolasi commit per `github_repo` + `github_branch`, dan riwayat commit di halaman detail task.
- [x] **Mesin Kalkulasi Workload & Asisten AI (RAG)**: Deteksi _overload_ (>80% kapasitas), asisten chat AI dengan ekstraksi pengetahuan skema & aturan kerja (`/api/ai/chat`), saran prioritas/durasi, dan pencatatan _override_ keputusan Leader.
- [x] **Dashboard Performa & Ekspor Laporan**: Grafik analitik proyek, tren penyelesaian, dan ekspor laporan Town Hall (`/api/dashboard/export`).

## 4. Penjaga Kualitas Kode & Keandalan

- [x] **Husky & Lint-Staged**: Pre-commit hook otomatis menjalankan ESLint dan Prettier.
- [x] **Validasi Skema Zod**: Seluruh input Server Actions dan endpoint API divalidasi dengan skema Zod.
- [x] **Suite Pengujian Terarah (`scripts/test-*.ts`)**: Skrip verifikasi otomatis tersedia untuk webhook GitHub & multi-repo, mesin kalkulasi _workload_, prioritas AI, _guardrails_ AI, dan RAG _knowledge extractor_.
- [x] **Global & Dashboard Error Boundaries**: Penanganan galat di `src/app/error.tsx` dan `src/app/(dashboard)/error.tsx` lengkap dengan pemulihan sesi otomatis saat terjadi _JWT clock skew_.
