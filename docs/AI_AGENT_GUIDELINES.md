# Panduan Agen AI (AI Agent Guidelines)

Dokumen ini menetapkan standar kerja teknis dan batasan operasional bagi agen AI yang berkolaborasi dalam pengembangan repositori **Workhub**.

---

## 1. Prinsip Utama Pengembangan

### Yang Wajib Dilakukan (Do's)

- **Pahami Konteks Sebelum Menulis Kode**: Selalu periksa struktur fitur di `src/features/<modul>/`, tipe di `src/types/database.types.ts`, serta panduan Next.js 16 di `node_modules/next/dist/docs/` sebelum melakukan perubahan.
- **Patuhi Arsitektur Modular**:
  - Gunakan **Server Components** secara bawaan pada `src/app/`.
  - Tempatkan direktif `'use client'` hanya pada komponen daun (_leaf components_) yang membutuhkan state interaktif browser.
  - Tandai seluruh berkas query database di `src/features/*/queries/` dengan `import 'server-only'`.
  - Validasi setiap input mutasi di Server Actions (`src/features/*/actions/`) menggunakan skema **Zod**.
- **Gunakan `@supabase/ssr`**: Gunakan helper resmi dari `src/lib/supabase/server.ts` untuk operasi yang menghormati RLS pengguna, dan `src/lib/supabase/admin.ts` hanya untuk operasi sistem yang telah memverifikasi otorisasi secara eksplisit.
- **Pertahankan Integritas Dokumentasi & Komentar**: Jangan menghapus komentar penjelas logika bisnis atau dokumentasi JSDoc yang sudah ada.
- **Komitmen Atomik & Conventional Commits**: Pisahkan commit berdasarkan konteks perubahan (misal: migrasi database terpisah dari komponen UI) dengan format `<type>(<scope>): <deskripsi singkat>`.
- **Jalankan Verifikasi QA Sebelum Selesai**: Wajib menjalankan `pnpm lint` dan `pnpm build` serta memastikan hasil kompilasi sukses tanpa galat.

### Yang Dilarang (Don'ts)

- **Jangan Melewati Batas Otorisasi**: Dilarang membobol atau menonaktifkan kebijakan Row Level Security (RLS), pemeriksaan peran `isManagementTeam` / `leader`, atau verifikasi tanda tangan webhook.
- **Jangan Menambahkan ORM Tambahan**: Jangan memasang Prisma, Drizzle, atau TypeORM; seluruh interaksi basis data menggunakan klien Supabase bertipe kuat (`Database` dari `src/types/database.types.ts`).
- **Jangan Mengirim Elemen UI Mati (Antislop Rules)**:
  - Setiap tombol, tautan, dialog, dan formulir wajib memiliki fungsi nyata.
  - Dilarang membuat angka statistik palsu, testimoni fiktif, atau _placeholder_ yang menyamar sebagai data asli.
  - Dilarang menggunakan karakter _em dash_ (`—`) pada teks antarmuka pengguna (gunakan koma, titik, atau titik dua).
  - Pastikan rasio kontras teks memenuhi standar WCAG AA (minimal 4.5:1 untuk teks normal) baik pada mode terang maupun gelap.

---

## 2. Alur Eksekusi Tugas Baru

1. **Sinkronisasi Cabang**:
   - Pastikan berada di cabang `dev` terbaru (`git checkout dev && git pull origin dev`).
   - Buat cabang fitur/perbaikan sesuai nomor issue (`git checkout -b feat/issue-<nomor>-<deskripsi>`).
2. **Perubahan Skema Database (Jika Ada)**:
   - Buat berkas migrasi SQL berurutan di `supabase/migrations/`.
   - Terapkan ke Supabase Cloud (`npx supabase db push`).
   - Perbarui definisi tipe di `src/types/database.types.ts` dan kamus RAG di `src/features/ai/rag/schema-dictionary.ts`.
3. **Implementasi Backend & UI**:
   - Bangun query (`queries/`), server action (`actions/`), dan komponen UI (`components/`) di dalam modul fitur terkait.
4. **Pengujian & Validasi Akhir**:
   - Jalankan skrip pengujian di `scripts/` yang relevan dengan fitur.
   - Jalankan `pnpm lint` dan `pnpm build`.
   - Buat Pull Request ke cabang `dev` dengan ringkasan perubahan dan bukti verifikasi.
