# Project Setup & Engineering Checklist (4-Month Roadmap)

Dokumen ini berfungsi sebagai panduan teknis ("second memory") untuk memastikan aplikasi dibangun dengan standar _Enterprise_, tangguh untuk pemeliharaan jangka panjang (_maintainable_), dan selalu siap untuk **presentasi klien mingguan**.

## 1. 🏗️ Database Migrations & Seeding (Supabase Cloud)

- [x] **Setup Supabase Cloud & Client SDK:** Menggunakan Supabase Cloud sebagai basis data terpusat (_Single Source of Truth_). Dependensi `@supabase/ssr` dan helper client telah terpasang.
- [x] **Sistem Migrasi (Version Control):** Skema `schema.sql` telah diubah menjadi format migrasi Supabase (`supabase/migrations/`). Seluruh perubahan tabel wajib dicatat di folder migrasi ini.
- [ ] **Data Seeder (`supabase/seed.sql`):** Buat _script_ SQL berisi data _dummy_ realistis untuk populasi awal di Supabase Cloud.

## 2. 🧩 UI Component & Design System

- [x] **Setup Tailwind CSS:** Konfigurasi tema warna dan variabel OKLCH terintegrasi di `src/app/globals.css`.
- [x] **Integrasi `shadcn/ui`:** Komponen atomik (`Button`, `Card`, `Dialog`, `Input`) telah terpasang di `src/components/ui/`.

## 3. 🛡️ Penjaga Kualitas Kode (Code Guardrails)

- [x] **Husky & Lint-Staged:** Pre-commit hook terpasang (`.husky/pre-commit`) menjalankan `tsc --noEmit` dan `lint-staged` (ESLint & Prettier).
- [ ] **Testing Framework (Vitest):** Konfigurasi awal `Vitest` untuk mengetes logika _backend/utilitas_ (misal: kalkulasi _workload_ yang kompleks).
- [ ] **Validasi Zod:** Setup Zod untuk skema validasi form dan parameter API.

## 4. 🌍 Environment & Deployment Strategy

Arsitektur lingkungan kerja:

- [x] **Development (`.env.local`):** Terhubung langsung ke project Supabase Cloud (`workhub`) untuk pengembangan harian tanpa perlu menjalankan Docker lokal.
- [ ] **Staging / Production Deployment:** CI/CD otomatis untuk linting dan build verification di GitHub Actions.

## 5. 🛠️ Error Handling & Observability

- [ ] **Global Error Boundaries:** Implementasikan `error.tsx` dan `global-error.tsx` di Next.js.
  - _Tujuan:_ Jika ada halaman yang error saat demo klien, UI tidak akan _blank_ putih, melainkan menampilkan pesan error UI yang sopan dan elegan.
- [ ] **Sentry (Opsional tapi disarankan):** Integrasi _error tracking_ untuk menangkap masalah di _Staging/Production_ secara otomatis.

---

_Catatan untuk Agen AI: Jadikan dokumen ini sebagai daftar periksa (checklist). Centang `[x]` pada item yang sudah berhasil diselesaikan._
