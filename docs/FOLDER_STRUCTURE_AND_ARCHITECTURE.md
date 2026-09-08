# Folder Structure & Architecture

Aplikasi Workhub (Task & Performance Dashboard) dibangun menggunakan kerangka kerja **Next.js (App Router)**. Dokumentasi ini memberikan panduan tentang penempatan file, pembagian komponen, manajemen status (*state*), dan aset.

## 1. Struktur Folder Next.js App Router

Keseluruhan source code aplikasi berada dalam folder `src/`. Berikut adalah arsitektur direktori utama:

```
src/
├── app/                  # (App Router) Definisi halaman (page.tsx), layout (layout.tsx), routing
├── components/           # Kumpulan komponen React
│   ├── layout/           # Komponen struktur halaman (Header, Sidebar, Footer, Navigation)
│   ├── ui/               # Komponen UI atomik/dasar (Button, Input, Card, Modal, Kanban) - sering dari UI library (shadcn/ui)
│   └── [feature]/        # Komponen spesifik untuk fitur tertentu (misal: /dashboard, /projects, /tasks, /auth)
├── lib/                  # Fungsi utilitas murni, formatters, helpers, actions Supabase
├── config/               # Konstanta konfigurasi, setup aplikasi, environment validasi
├── hooks/                # Custom React Hooks
├── services/             # Integrasi API luar (Supabase fetchers, GitHub API, LLM API)
└── store/ atau context/  # Manajemen state global (Zustand atau React Context)
```

## 2. Batas Server vs Client Component

Dalam arsitektur App Router Next.js, komponen secara *default* adalah **Server Components**. Pahami batasannya agar aplikasi tetap berkinerja tinggi.

**Kapan Wajib Menggunakan `"use client"`?**
- Jika komponen membutuhkan interaksi pengguna atau *Event Listeners* (`onClick`, `onChange`, `onSubmit`, interaksi drag-and-drop Kanban).
- Jika komponen membutuhkan *React Hooks* untuk manajemen *state* dan siklus hidup (Lifecycle) (`useState`, `useEffect`, `useReducer`).
- Jika komponen menggunakan API browser (`window`, `document`, `localStorage`).
- *Best Practice*: Tempatkan `"use client"` sejauh mungkin pada level bawah (daun/leaf) di pohon komponen. Jangan membungkus seluruh halaman (`page.tsx`) dengan `"use client"` kecuali benar-benar perlu, untuk mempertahankan kecepatan render dan beban server yang optimal.

## 3. Arsitektur State & Sinkronisasi

- **Transisi State & Interaktivitas**:
  1. **Phase 1 (Optimistic UI)**: Karena ini dashboard produktivitas (terutama Kanban drag-and-drop), UI harus bereaksi secara instan ketika Task digeser (optimistic UI updates). Jangan blokir interaksi pengguna sambil menunggu respons dari *database cloud*.
  2. **Phase 2 (Cloud Sync)**: Gunakan fungsi/mutasi asinkron (Server Actions atau route handler) untuk memastikan *state* Kanban yang baru disinkronkan langsung dengan database **Supabase**.
- Manajemen *state* untuk halaman-halaman yang membutuhkan banyak filter client-side (seperti dashboard performa kuartalan) bisa mengandalkan URL search params agar mudah di-share (*shareable links*).

## 4. Aset Pipeline & File Storage

Aset statis diletakkan pada folder `public/`.

- **Ilustrasi Visual (`/public/images/` atau `/public/icons/`)**:
  - Gunakan format **`.svg`** untuk ikon dan ilustrasi vektor agar tajam pada semua ukuran layar dan hemat ruang.
  - Untuk gambar raster, gunakan format **`.webp`** (lebih ringan dari JPEG/PNG konvensional) untuk optimasi kecepatan *loading*.
- **Attachments / File Unggahan (Task)**:
  - Disimpan menggunakan **Supabase Storage** (tidak disimpan statis di `/public/`), dengan validasi ketat untuk ukuran dan ekstensi/tipe file pada sisi server saat *upload*.
