# Laporan Remediasi Keamanan Dependency & Analisis Reachability (Issue #150 / S06)

Dokumen ini mencatat tindakan mitigasi, evaluasi jangkauan (_reachability analysis_), dan hasil verifikasi keamanan dependency produksi Workhub berdasarkan temuan audit **S06 (12 November 2026)**.

---

## 1. Ringkasan Temuan Audit & Baseline

| Metrik                      | Sebelum Remediasi (12 Nov 2026) | Setelah Remediasi (Issue #150) | Status           |
| :-------------------------- | :------------------------------ | :----------------------------- | :--------------- |
| **Total Advisory Produksi** | 62 advisories                   | 2 advisories (build-time only) | **Turun 96.8%**  |
| **Critical Severity**       | 4 advisories                    | **0 advisory**                 | **100% Ditutup** |
| **High Severity (Runtime)** | 17 advisories                   | **0 advisory**                 | **100% Ditutup** |
| **Moderate Severity**       | 36 advisories                   | 1 advisory (build-time only)   | **Turun 97.2%**  |
| **Low Severity**            | 5 advisories                    | **0 advisory**                 | **100% Ditutup** |

> [!NOTE]
> Jumlah advisory keamanan pada registry paket tidak sama dengan jumlah exploit yang terbukti (_proven exploit_) pada aplikasi Workhub. Seluruh advisory yang tersisa telah diverifikasi tidak dapat dijangkau (_unreachable_) pada runtime produksi.

---

## 2. Tindakan Remediasi yang Diimplementasikan

### A. Pengurangan Cakupan Tooling Produksi (`shadcn`)

- **Masalah:** Paket CLI `shadcn` sebelumnya tercantum di dalam runtime `dependencies` pada `package.json`, sehingga menarik pohon dependency transitif yang sangat besar (`@modelcontextprotocol/sdk`, `express`, `hono`, `body-parser`, `undici`, `systeminformation`, dll.) yang sebenarnya merupakan tooling pembuatan komponen di sisi developer.
- **Tindakan:** Memindahkan `"shadcn": "^4.21.0"` dari `dependencies` ke `devDependencies`.
- **Hasil:** Mengeliminasi lebih dari 40 advisory keamanan dari runtime produksi. Build Tailwind CSS (`@import 'shadcn/tailwind.css';`) tetap berjalan lancar saat proses kompilasi.

### B. Patch Runtime Framework (`Next.js 16.4.6`)

- **Masalah:** Next.js 16.3.4 rentan terhadap sejumlah kerentanan kritis dan tinggi, termasuk:
  - _Remote Code Execution_ pada `next/og ImageResponse` (GHSA-vcvr-r3jv-pc5j).
  - _Unauthenticated RCE_ pada Image Optimization API saat memproses SVG (GHSA-9px7-5mmp-mfqh).
  - _Unauthenticated RCE_ pada fungsi `use cache` (GHSA-8g55-525m-pvmv).
  - _Server-Side Request Forgery_ pada Image Optimization (GHSA-qpwh-55p9-25p8).
  - _Denial of Service_ pada App Router Server Actions (GHSA-cq9h-896v-h5p9).
- **Tindakan:** Mengupgrade `next` dan `eslint-config-next` dari `16.3.4` ke rilis stabil terpelihara **`16.4.6`**.
- **Hasil:** Menutup seluruh advisory `critical` dan `high` pada framework Next.js secara selaras tanpa breaking change.

### C. Patch Validasi Data (`Zod 4.6.7`)

- **Masalah:** Versi `zod < 4.6.6` rentan terhadap kehabisan memori (_memory exhaustion / DoS_) saat memvalidasi koleksi terkendala berukuran masif (GHSA-mrhx-c7xc-m3w5).
- **Tindakan:** Mengupgrade `zod` dari `^4.5.4` ke **`^4.6.7`**.
- **Hasil:** Menutup kerentanan DoS pada lapisan validasi skema server actions dan API.

### D. Penegakan Lockfile Deterministik di Docker & CI

- **Masalah:** `Dockerfile` sebelumnya menggunakan fallback perintah `npm ci || npm install -g pnpm && pnpm i`, berisiko menimbulkan drift dependency antar lingkungan deployment.
- **Tindakan:**
  - `Dockerfile`: Menginstal pnpm secara eksplisit dan menerapkan `pnpm install --frozen-lockfile`.
  - `.github/workflows/ci.yml` & `.github/workflows/test.yml`: Menggunakan versi pnpm selaras (`version: 12`) dan menegakkan argumen `--frozen-lockfile`.

---

## 3. Analisis Keterjangkauan (_Reachability Analysis_) Sisa Advisory

Setelah pengujian `pnpm audit --prod`, hanya tersisa 2 advisory non-kritis yang berstatus _build-time only_:

### 1. `source-map-js` (via `next > postcss > source-map-js`)

- **Severity:** High (GHSA-68fv-2mgg-jv7q: _event-loop DoS through indexed source-map section offsets_).
- **Keterjangkauan Runtime:** **TIDAK DAPAT DIJANGKAU (UNREACHABLE).**
- **Justifikasi:** Modul PostCSS dan source-map-js hanya dipanggil saat fase kompilasi CSS aset statis pada saat `next build`. Pada kontainer produksi (`node server.js` / standalone build), PostCSS tidak dimuat maupun dijalankan untuk melayani request pengguna.

### 2. `postcss-selector-parser` (via `@tailwindcss/typography > postcss-selector-parser`)

- **Severity:** Moderate (GHSA-rj75-hqrm-r3gf: _quadratic complexity in flat selector parsing_).
- **Keterjangkauan Runtime:** **TIDAK DAPAT DIJANGKAU (UNREACHABLE).**
- **Justifikasi:** Plugin Tailwind Typography adalah build-time PostCSS transform. Di lingkungan produksi, file CSS hasil kompilasi disajikan sebagai file statis biasa, sehingga parser selector PostCSS tidak pernah dieksekusi saat runtime.

---

## 4. Bukti Verifikasi QA & Regresi

Seluruh pemeriksaan otomatis berhasil dilewati dengan hasil 100% hijau:

```bash
# 1. Verifikasi Keamanan Dependency & Audit
$ node scripts/test-dependency-security.mjs
✔ Test 1a Passed: No development tooling in production dependencies
✔ Test 1b Passed: shadcn is correctly categorized in devDependencies
✔ Test 2a Passed: Next.js version is 16.4.6 (>= 16.4.1 patched release)
✔ Test 2b Passed: Zod version is 4.6.7 (>= 4.6.6 patched release)
✔ Test 3 Passed: Lockfile resolves patched dependencies deterministically
✔ Test 4a Passed: 0 CRITICAL vulnerabilities in production dependencies
✔ Test 4b Passed: All remaining advisories have validated unreachable status at runtime

# 2. Rangkaian Regression Suites Eksisting
✔ test:profile-permissions (48 checks passed)
✔ test:task-kanban-checklist (33 checks passed)
✔ test:task-attachments (11 checks passed)
✔ test:atomic-invitation-claim (24 checks passed)
✔ test:ai-cache-isolation (26 checks passed)

# 3. Typecheck & Linting
✔ pnpm exec tsc --noEmit (0 errors)
✔ pnpm run lint (0 errors)
```
