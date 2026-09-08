# Project Setup & Engineering Checklist (4-Month Roadmap)

Dokumen ini berfungsi sebagai panduan teknis ("second memory") untuk memastikan aplikasi dibangun dengan standar *Enterprise*, tangguh untuk pemeliharaan jangka panjang (*maintainable*), dan selalu siap untuk **presentasi klien mingguan**.

## 1. 🏗️ Database Migrations & Seeding (Fokus Demo)
- [ ] **Inisialisasi Supabase CLI:** Gunakan perintah `supabase init` untuk mengelola *database* secara lokal.
- [ ] **Sistem Migrasi (Version Control):** Ubah `schema.sql` mentah menjadi format migrasi Supabase (`supabase migration new`). Semua perubahan DB wajib menggunakan file migrasi, bukan diubah langsung dari *dashboard UI*.
- [ ] **Data Seeder (`supabase/seed.sql`):** Buat *script* otomatis berisi data *dummy* (Task, Project, Milestone, Profil pengguna) yang realistis.
  - *Tujuan:* 10 menit sebelum presentasi klien, cukup jalankan perintah reset, dan *dashboard* akan penuh dengan data visual yang indah.

## 2. 🧩 UI Component & Design System
- [ ] **Setup Tailwind CSS:** Pastikan konfigurasi warna (*primary*, *secondary*, *accent*) terpusat pada file konfigurasi untuk konsistensi *branding* klien.
- [ ] **Integrasi `shadcn/ui`:** Inisialisasi library komponen (Button, Card, Modal, Input).
  - *Tujuan:* Menjaga komponen tetap rapi, *bug-free*, dapat digunakan ulang, dan terlihat profesional.

## 3. 🛡️ Penjaga Kualitas Kode (Code Guardrails)
- [ ] **Husky & Lint-Staged:** Pasang *pre-commit hook*. Setiap kali ada perintah `git commit`, sistem wajib menjalankan ESLint dan Prettier.
  - *Tujuan:* Memastikan kode tetap bersih dan mencegah *commit* yang rusak, sangat vital untuk proyek jangka panjang yang dikerjakan banyak tim/AI.
- [ ] **Testing Framework (Vitest):** Konfigurasi awal `Vitest` untuk mengetes logika *backend/utilitas* (misal: kalkulasi *workload* yang kompleks).
- [ ] **Validasi Zod:** Setup Zod untuk skema validasi form dan parameter API (melindungi dari injeksi/error input).

## 4. 🌍 Environment & Deployment Strategy
Pemisahan lingkungan kerja secara tegas:
- [ ] **Development (`.env.local`):** Localhost dengan Supabase lokal untuk ngoding sehari-hari tanpa mengganggu data asisten lain.
- [ ] **Staging (`.env.staging`):** URL khusus untuk **Demo Klien**. Database terpisah yang di-reset dengan data *seed* yang rapi sebelum presentasi. (Dideploy otomatis setiap ada PR yang di-merge ke branch `dev`).
- [ ] **Production (`.env.production`):** Lingkungan rilis final di akhir bulan ke-4.

## 5. 🛠️ Error Handling & Observability
- [ ] **Global Error Boundaries:** Implementasikan `error.tsx` dan `global-error.tsx` di Next.js.
  - *Tujuan:* Jika ada halaman yang error saat demo klien, UI tidak akan *blank* putih, melainkan menampilkan pesan error UI yang sopan dan elegan.
- [ ] **Sentry (Opsional tapi disarankan):** Integrasi *error tracking* untuk menangkap masalah di *Staging/Production* secara otomatis.

---
*Catatan untuk Agen AI: Jadikan dokumen ini sebagai daftar periksa (checklist). Centang `[x]` pada item yang sudah berhasil diselesaikan.*
