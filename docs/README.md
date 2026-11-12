# Dokumentasi Teknis Workhub

Selamat datang di pusat dokumentasi teknis **Workhub (Task & Performance Dashboard)**. Dokumen di dalam direktori ini menjadi rujukan arsitektur, basis data, alur kerja pengembangan, dan spesifikasi produk.

---

## Daftar Dokumen

| Dokumen                                                                                                             | Deskripsi                                                                                                                                                                      |
| :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Product Requirements Document (`prd.md`)](./prd.md)**                                                            | Spesifikasi produk lengkap: latar belakang masalah, daftar fitur (US-01 s.d. US-28), matriks hak akses (Management, Leader, Member), dan kriteria penerimaan.                  |
| **[Arsitektur & Struktur Folder (`FOLDER_STRUCTURE_AND_ARCHITECTURE.md`)](./FOLDER_STRUCTURE_AND_ARCHITECTURE.md)** | Peta struktur direktori Next.js App Router (`src/app`, `src/features`, `src/components`, `src/lib`), pemisahan Server vs Client Components, dan pola Server Actions.           |
| **[Skema Basis Data & RLS (`DATABASE_SCHEMA.md`)](./DATABASE_SCHEMA.md)**                                           | Dokumentasi lengkap 18 tabel PostgreSQL di Supabase, Entity Relationship Diagram (ERD), fungsi _trigger_ otomatis, dan kebijakan Row Level Security (RLS).                     |
| **[Diagram Sistem (`diagram.md`)](./diagram.md)**                                                                   | Kumpulan diagram visual Mermaid: ERD lengkap, Activity Diagram (siklus hidup Task, eskalasi CS, alur QA, pelaporan Town Hall), dan Use Case Diagram.                           |
| **[Definisi SQL Lengkap (`schema.sql`)](./schema.sql)**                                                             | Referensi skrip DDL SQL untuk seluruh tabel, tipe _enum_, _index_, dan _trigger_ sesuai migrasi terbaru di `supabase/migrations/`.                                             |
| **[Infrastruktur & CI/CD (`INFRASTRUCTURE_AND_CICD.md`)](./INFRASTRUCTURE_AND_CICD.md)**                            | Konfigurasi Supabase Cloud, variabel lingkungan (`.env.local`), bucket penyimpanan lampiran, konfigurasi _webhook_ GitHub multi-repositori, dan pipeline pemeriksaan kualitas. |
| **[GitFlow & Konvensi (`GITFLOW_AND_CONVENTIONS.md`)](./GITFLOW_AND_CONVENTIONS.md)**                               | Aturan cabang (`master`, `dev`, `feat/*`, `fix/*`, `docs/*`), standar _Conventional Commits_, komitmen atomik, dan templat Pull Request.                                       |
| **[Panduan Agen AI (`AI_AGENT_GUIDELINES.md`)](./AI_AGENT_GUIDELINES.md)**                                          | Pedoman pengembangan untuk kolaborasi bersama agen AI: pencegahan regresi, keamanan akses data, aturan penulisan UI, dan protokol verifikasi QA.                               |
| **[Daftar Periksa Proyek (`PROJECT_SETUP_CHECKLIST.md`)](./PROJECT_SETUP_CHECKLIST.md)**                            | Status pencapaian tonggak teknis (_engineering milestones_) dari fase inisialisasi hingga kesiapan produksi.                                                                   |

---

## Ringkasan Alur Kerja Cepat

1. Buat cabang fitur atau perbaikan baru dari `dev` (`git checkout dev && git pull origin dev && git checkout -b feat/issue-xx-deskripsi`).
2. Tuangkan setiap perubahan struktur tabel ke berkas migrasi baru di `supabase/migrations/`, terapkan dengan `npx supabase db push`, dan sinkronkan ke `src/types/database.types.ts`.
3. Jalankan `pnpm lint` dan `pnpm build` hingga bebas dari galat sebelum membuka Pull Request ke `dev`.
