# Panduan Agen AI (AI Agent Guidelines)

Dokumen ini menetapkan standar kerja teknis dan batasan operasional bagi agen AI yang berkolaborasi dalam pengembangan repositori **Workhub**.

---

## 1. Prinsip Utama Pengembangan

### Yang Wajib Dilakukan (Do's)

- Periksa struktur fitur di `src/features/<modul>/`, tipe di `src/types/database.types.ts`, serta panduan Next.js 16 di `node_modules/next/dist/docs/` sebelum melakukan perubahan.
- Gunakan Server Components secara bawaan pada `src/app/` dan tempatkan direktif `'use client'` hanya pada komponen daun (_leaf components_) yang membutuhkan state interaktif browser.
- Tandai seluruh berkas query database di `src/features/*/queries/` dengan `import 'server-only'` dan validasi setiap input mutasi di Server Actions (`src/features/*/actions/`) menggunakan skema Zod.
- Gunakan helper resmi `@supabase/ssr` dari `src/lib/supabase/server.ts` untuk operasi yang menghormati RLS pengguna, dan `src/lib/supabase/admin.ts` hanya untuk operasi sistem yang telah memverifikasi otorisasi secara eksplisit.
- Pertahankan komentar penjelas logika bisnis atau dokumentasi JSDoc yang sudah ada.
- Pisahkan commit berdasarkan konteks perubahan (misal: migrasi database terpisah dari komponen UI) dengan format `<type>(<scope>): <deskripsi singkat>`.
- Jalankan `pnpm lint` dan `pnpm build` serta pastikan hasil kompilasi sukses tanpa galat sebelum menyelesaikan tugas.

### Yang Dilarang (Don'ts)

- Dilarang membobol atau menonaktifkan kebijakan Row Level Security (RLS), pemeriksaan peran `isManagementTeam` / `leader`, atau verifikasi tanda tangan webhook.
- Jangan memasang ORM tambahan seperti Prisma, Drizzle, atau TypeORM; seluruh interaksi basis data menggunakan klien Supabase bertipe kuat (`Database` dari `src/types/database.types.ts`).
- Setiap tombol, tautan, dialog, dan formulir wajib memiliki fungsi nyata (aturan Antislop).
- Dilarang membuat angka statistik palsu, testimoni fiktif, atau _placeholder_ yang menyamar sebagai data asli.
- Dilarang menggunakan karakter _em dash_ pada teks antarmuka pengguna (gunakan koma, titik, atau titik dua).
- Pastikan rasio kontras teks memenuhi standar WCAG AA (minimal 4.5:1 untuk teks normal) baik pada mode terang maupun gelap.

---

## 2. Alur Eksekusi Tugas Baru

1. Pastikan berada di cabang `dev` terbaru (`git checkout dev && git pull origin dev`), lalu buat cabang fitur/perbaikan sesuai nomor issue (`git checkout -b feat/issue-<nomor>-<deskripsi>`).
2. Jika ada perubahan skema database, buat berkas migrasi SQL berurutan di `supabase/migrations/`, terapkan ke Supabase Cloud (`npx supabase db push`), lalu perbarui `src/types/database.types.ts` dan `src/features/ai/rag/schema-dictionary.ts`.
3. Bangun query (`queries/`), server action (`actions/`), dan komponen UI (`components/`) di dalam modul fitur terkait.
4. Jalankan skrip pengujian di `scripts/` yang relevan, jalankan `pnpm lint` dan `pnpm build`, lalu buat Pull Request ke cabang `dev` dengan ringkasan perubahan dan bukti verifikasi.
