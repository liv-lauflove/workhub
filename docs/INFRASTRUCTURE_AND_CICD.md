# Infrastruktur & CI/CD

Dokumen ini menjelaskan arsitektur infrastruktur cloud, konfigurasi lingkungan, penyimpanan berkas, integrasi webhook eksternal, dan alur pemeriksaan kualitas pada proyek **Workhub**.

---

## 1. Basis Data & Autentikasi (Supabase Cloud)

- Workhub menggunakan **Supabase Cloud** sebagai penyedia basis data PostgreSQL, autentikasi sesi (`@supabase/ssr`), dan penyimpanan objek (_Supabase Storage_) tanpa ketergantungan pada kontainer Docker lokal.
- Empat modul klien di `src/lib/supabase/` memisahkan konteks eksekusi:
  - `client.ts`: Klien peramban (`createBrowserClient`) untuk interaksi _client-side_.
  - `server.ts`: Klien server (`createServerClient` terikat pada `cookies()` Next.js) yang menghormati penuh kebijakan Row Level Security (RLS) pengguna aktif.
  - `admin.ts`: Klien administratif (`service_role`) khusus untuk operasi belakang layar yang telah memverifikasi otorisasi secara mandiri (seperti pencatatan commit dari webhook GitHub atau klaim undangan tim).
  - `middleware.ts`: Penyegar sesi otomatis pada setiap permintaan rute terproteksi, dilengkapi penanganan toleransi selisih waktu jam (_JWT clock skew tolerance_).

---

## 2. Variabel Lingkungan (`.env.local`)

Berikut daftar variabel lingkungan yang wajib dikonfigurasi pada lingkungan pengembangan maupun produksi:

| Variabel                               | Sifat            | Kegunaan                                                                                                 |
| :------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Publik           | URL endpoint proyek Supabase Cloud.                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Publik           | Kunci anonim publik Supabase untuk inisialisasi klien SSR.                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publik           | Kunci publikasi Supabase.                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`            | Rahasia (Server) | Kunci _service role_ untuk operasi admin dan webhook. Tidak boleh diekspos ke klien.                     |
| `NEXT_PUBLIC_SITE_URL`                 | Publik           | URL dasar aplikasi (misal `http://localhost:3000` atau domain produksi).                                 |
| `GITHUB_CLIENT_ID`                     | Rahasia (Server) | Client ID aplikasi GitHub OAuth.                                                                         |
| `GITHUB_CLIENT_SECRET`                 | Rahasia (Server) | Client Secret aplikasi GitHub OAuth.                                                                     |
| `GITHUB_WEBHOOK_SECRET`                | Rahasia (Server) | Kunci rahasia bersama untuk memverifikasi tanda tangan `X-Hub-Signature-256` pada `/api/github-webhook`. |

---

## 3. Supabase Storage (`task-attachments`)

- Lampiran berkas pada task disimpan di dalam bucket **`task-attachments`** (dikonfigurasi melalui migrasi `20261006120000_storage_attachments_bucket.sql`).
- Batas ukuran berkas maksimum adalah **5 MB** per unggahan (`MAX_FILE_SIZE` di `src/lib/constants.ts`).
- Tipe MIME yang diizinkan meliputi gambar (`jpeg`, `png`, `webp`, `svg`), dokumen PDF, Word (`.doc`, `.docx`), dan lembar sebar Excel (`.xls`, `.xlsx`).

---

## 4. Konfigurasi GitHub Webhook Multi-Repository

Untuk menghubungkan satu atau beberapa repositori GitHub ke Workhub:

1. Buka **Settings -> Webhooks -> Add webhook** pada repositori GitHub (atau pada level GitHub Organization jika ingin otomatis menangkap semua repositori di organisasi).
2. Isi **Payload URL** dengan `https://<domain-workhub>/api/github-webhook`.
3. Pilih **Content type**: `application/json`.
4. Isi **Secret** sesuai nilai `GITHUB_WEBHOOK_SECRET` di `.env.local`.
5. Pilih peristiwa **Just the `push` event** dan aktifkan webhook.
6. Di antarmuka Workhub (seksi **Development** pada detail Task), isi nama repository target (misal `liv-lauflove/workhub`) dan nama branch pengerjaan.

---

## 5. Penjaga Kualitas Kode & Pipeline CI/CD

### Pre-commit Guardrails (Husky & lint-staged)

Setiap kali pengembang menjalankan `git commit`, hook `.husky/pre-commit` secara otomatis menjalankan:

- `eslint --fix` dan `prettier --write` pada berkas kode (`.ts`, `.tsx`, `.js`, `.jsx`) yang di-_stage_.
- Pemformatan otomatis pada berkas `.json`, `.css`, dan `.md`.

### Verifikasi Pra-Rilis & Skrip Pengujian

Sebelum menggabungkan Pull Request ke `dev` atau `master`, wajib lulus pemeriksaan berikut:

1. Jalankan `pnpm lint` dan pastikan 0 errors.
2. Jalankan `pnpm build` untuk memastikan seluruh halaman statis, rute dinamis, dan Server Actions terkompilasi bersih dengan Next.js Turbopack.
3. Gunakan endpoint `/api/health` untuk memantau ketersediaan layanan aplikasi setelah _deployment_.
