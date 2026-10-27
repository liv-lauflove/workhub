# GitFlow & Konvensi Kode

Dokumen ini mendefinisikan standar percabangan Git, format pesan commit, dan tata cara pembuatan Pull Request pada proyek **Workhub**.

---

## 1. Model Percabangan (GitFlow)

- **`master`**: Cabang produksi utama. Dilarang melakukan commit langsung ke cabang ini; pembaruan hanya masuk melalui penggabungan (_merge_) dari `dev` yang telah teruji.
- **`dev`**: Cabang integrasi utama tempat seluruh fitur dan perbaikan digabungkan.
- **Cabang Kerja (dibuat dari `dev`)**:
  - `feat/issue-<nomor>-<slug>` : Fitur baru (contoh: `feat/issue-133-multi-repo-github`)
  - `fix/issue-<nomor>-<slug>` : Perbaikan bug (contoh: `fix/issue-119-multi-team`)
  - `refactor/<slug>` : Perombakan struktur kode atau peningkatan UI tanpa mengubah kontrak fitur
  - `docs/<slug>` : Pembaruan dokumentasi teknis di `docs/` atau `README.md`
  - `chore/<slug>` : Pemeliharaan konfigurasi, dependensi, atau skrip utilitas
  - `test/<slug>` : Penambahan atau perbaikan skrip pengujian

---

## 2. Standar Pesan Commit (Conventional Commits)

Gunakan format huruf kecil:

```text
<type>(<scope>): <deskripsi singkat dalam bahasa inggris> (#<nomor-issue>)
```

### Tipe Commit (`<type>`)

- `feat`: Penambahan fitur baru
- `fix`: Perbaikan bug atau regresi
- `refactor`: Perbaikan kualitas kode/UI tanpa menambah fitur baru
- `docs`: Perubahan dokumentasi
- `test`: Penambahan atau pembaruan pengujian
- `chore`: Perubahan build, konfigurasi, atau dependensi

### Lingkup Umum (`<scope>`)

`db`, `auth`, `milestones`, `projects`, `kanban`, `tasks`, `team`, `workload`, `dashboard`, `github`, `ai`, `notifications`, `ui`, `docs`.

### Contoh Commit Nyata di Workhub

- `feat(db): add github_repo column and activity log tracking to tasks (#133)`
- `feat(github): implement multi-repository matching and filtering in webhook handler (#133)`
- `feat(team): add team stats query and server actions for create and update teams (#134)`
- `refactor(ui): polish github development section and commits card following antislop principles`
- `fix(auth): absorb jwt clock skew pgrst303 and improve dashboard error recovery (#134)`

### Aturan Commit Atomik

- Pisahkan commit berdasarkan konteks perubahan (contoh: commit migrasi database dan tipe terlebih dahulu, kemudian commit logika backend/webhook, lalu commit komponen UI, dan terakhir commit pengujian).
- Hindari menyatukan banyak perubahan berbeda ke dalam satu commit raksasa.

---

## 3. Standar Pull Request (PR)

Setiap Pull Request wajib diarahkan ke cabang `dev` (`base: dev`) dan telah lulus pemeriksaan `pnpm lint` serta `pnpm build`.

### Format Body PR

```markdown
## Summary

[Ringkasan jelas mengenai tujuan fitur atau perbaikan yang dikerjakan]

## Changes

### Database & Schema

- **`supabase/migrations/...`**: [Deskripsi perubahan skema/migrasi]

### Data Model & Actions

- **`src/features/...`**: [Deskripsi query, server actions, atau handler baru]

### UI Components

- **`src/features/.../components/...`**: [Deskripsi pembaruan antarmuka]

## Verification

- [x] `pnpm lint` - 0 errors
- [x] `pnpm build` - Build produksi sukses
- [x] Pengujian fungsional / skrip verifikasi lulus

Closes #<nomor-issue>
```
