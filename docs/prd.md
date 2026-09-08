# Product Requirements Document (PRD)
## Task & Performance Dashboard — Next.js Fullstack

| | |
|---|---|
| **Versi** | 2.0 (Kompleks) |
| **Status** | Draft — menunggu validasi supervisor/PIC |
| **Proyek** | Internal tool, magang PT Bima Sakti Alterra |
| **Tim Terlibat** | Aegis, Sentinel |

---

## Daftar Isi
1. Ringkasan Eksekutif
2. Latar Belakang & Masalah
3. Tujuan & Success Metrics
4. Ruang Lingkup
5. Glosarium
6. Persona & Peran Pengguna
7. Arsitektur Sistem
8. Hierarki Struktur Kerja
9. Functional Requirements (per modul, dengan Acceptance Criteria)
10. Matriks Hak Akses
11. Non-Functional Requirements
12. Model Data
13. Alur Pengguna Utama
14. Daftar Halaman / Layar
15. Rencana Rilis & Timeline
16. Risiko & Mitigasi
17. Dependensi & Asumsi
18. Definition of Done
19. Open Questions
20. Lampiran

---

## 1. Ringkasan Eksekutif

Task & Performance Dashboard adalah aplikasi web internal untuk menggantikan pencatatan progres kerja manual dengan sistem terstruktur bergaya GitHub Projects: **Milestone → Project → Task**, dilengkapi papan Kanban drag-and-drop, dashboard performa kuartalan, integrasi GitHub, dan asisten AI untuk membantu leader mengelola beban kerja tim. Dibangun dengan Next.js Fullstack dan Supabase (Postgres + Auth).

## 2. Latar Belakang & Masalah

- Pelaporan progres ke Town Hall kuartalan masih disusun manual, memakan waktu dan rawan data tidak sinkron.
- Tidak ada visibilitas real-time terhadap beban kerja tiap anggota tim, sehingga penumpukan tugas (overload) baru diketahui setelah terjadi.
- Task dari komplain Customer Service tercatat terpisah dari task pengembangan reguler, menyulitkan pelacakan.
- Progres kode (commit/branch) tidak terhubung langsung dengan task terkait, sehingga leader harus mengecek GitHub secara manual.

## 3. Tujuan & Success Metrics

**Tujuan utama:** memberi leader visibilitas real-time atas progres kerja dan beban tim, serta mengotomasi sebagian pekerjaan administratif pelaporan.

> Metrik di bawah ini adalah **usulan** dan perlu divalidasi dengan supervisor sebelum dijadikan acuan formal.

| Metrik | Target Usulan |
|---|---|
| Waktu persiapan laporan Town Hall kuartalan | Berkurang signifikan (dashboard menggantikan rekap manual) |
| Deteksi member overload (>80% kapasitas) | Real-time, bukan retrospektif |
| Waktu leader menautkan task ↔ kode | Berkurang lewat integrasi GitHub otomatis |
| Adopsi | Seluruh anggota tim Aegis & Sentinel aktif memakai board mingguan |

## 4. Ruang Lingkup

**In-scope (MVP 4 bulan):**
- Auth (Supabase Auth: manual + Google/GitHub OAuth)
- CRUD Milestone, Project, Task
- Kanban board dengan kolom custom per Project
- Dashboard performa dengan filter tim/tahun/kuartal
- Workload & capacity tracking berbasis priority
- Integrasi GitHub (link branch, tampil commit history)
- Fitur AI: chatbot, auto-prioritizing, AI warning, caching, dengan guardrail (leader bisa override saran AI)
- Notifikasi in-app & activity log per Task
- Manajemen anggota tim (invite, assign role) oleh leader
- Attachment file & pencarian Task
- Task dependencies (blocking antar task)
- Export laporan dashboard (PDF/Excel)
- Archiving Milestone/Project yang sudah selesai
- Testing (unit + UAT) dan environment terpisah (dev/staging/production)

**Out-of-scope (belum di fase ini):**
- Integrasi langsung dengan tools CS (WA/email/Zendesk) — task dari CS tetap dientri manual oleh leader
- Snapshot historis workload (kapasitas dihitung on-the-fly)
- Role Admin lintas-tim / superuser
- Aplikasi mobile native (cukup web responsif)

## 5. Glosarium

| Istilah | Arti |
|---|---|
| **Milestone** | Target strategis level tertinggi, dibuat leader, punya PIC dan rentang tanggal |
| **Project** | Kumpulan pekerjaan menuju satu Milestone, terikat ke satu tim |
| **Task** | Unit kerja terkecil, kartu di papan Kanban |
| **PIC** | Person in Charge — penanggung jawab Milestone/Project |
| **Overload** | Beban kerja anggota tim melebihi 80% baseline kapasitas |
| **Origin (Task)** | Asal task: `normal` atau `cs_complaint` |
| **Dependency** | Relasi "blocked by" antar Task — satu Task menunggu Task lain selesai |
| **Activity Log** | Riwayat perubahan otomatis tiap Task (siapa mengubah apa, kapan) |
| **Archive** | Status non-aktif untuk Milestone/Project selesai; disembunyikan dari listing utama tapi tidak dihapus |

## 6. Persona & Peran Pengguna

**Leader (mis. "Kak Rani", Team Lead Aegis)**
Bertanggung jawab menyusun target kuartalan, membagi task ke anggota, dan melapor progres tiap Town Hall. Butuh visibilitas cepat siapa yang overload dan proyek mana yang berisiko molor.

**Member (mis. "Bima", Software Engineer di Sentinel)**
Mengerjakan task yang di-assign, update status via drag-and-drop, menautkan branch kerja ke task, dan diskusi lewat comment thread di kartu task.

| Role | Kewenangan Inti |
|---|---|
| **Leader** | Membuat Milestone, Project, Task (termasuk dari komplain CS), melihat dashboard tim, mengatur kolom Kanban |
| **Member** | Mengerjakan & update status Task miliknya, komentar, menautkan branch GitHub |

## 7. Arsitektur Sistem

```
┌─────────────────────────┐
│   Next.js (Fullstack)   │
│  - App Router / Server  │
│    Actions              │
│  - UI: Dashboard, Kanban│
└────────────┬─────────────┘
             │
   ┌─────────┼──────────────┐
   ▼         ▼               ▼
┌───────┐ ┌────────────┐ ┌──────────────┐
│Supabase│ │ GitHub API │ │ LLM Provider │
│Postgres│ │ (OAuth +   │ │ (chatbot,    │
│+ Auth  │ │ webhook)   │ │ auto-prior., │
│(RLS)   │ │            │ │ warning)     │
└───────┘ └────────────┘ └──────────────┘
```

- **Frontend + Backend:** Next.js (Server Actions / API Routes) — satu codebase.
- **Database & Auth:** Supabase Postgres, Supabase Auth (RLS untuk enforce role leader/member).
- **Integrasi GitHub:** OAuth untuk login/link akun, webhook atau polling untuk commit history.
- **AI Layer:** panggilan ke LLM API dengan function/tool execution untuk chatbot & auto-prioritizing; caching layer di depan panggilan LLM (lihat `ai_query_cache` di skema).

## 8. Hierarki Struktur Kerja

| Level | Field Utama | Dibuat oleh | Catatan |
|---|---|---|---|
| **Milestone** | judul, deskripsi, PIC, tanggal mulai, tanggal target, status | Leader | Tidak terikat satu tim — bisa lintas tim |
| **Project** | nama, deskripsi, milestone terkait, tim (Aegis/Sentinel), PIC, status | Leader | Satu Milestone → banyak Project |
| **Task** | judul, deskripsi, project, kolom kanban, assignee, priority, origin, branch GitHub | Leader (task dari CS **wajib** leader; task normal juga dibuat/di-assign leader per desain saat ini) | Satu Project → banyak Task |

## 9. Functional Requirements

### 9.1 Autentikasi & Manajemen Pengguna
- **US-01** — Sebagai pengguna, saya ingin login lewat Google/GitHub atau email-password, supaya proses masuk cepat dan fleksibel.
  - AC: Login berhasil membuat sesi Supabase Auth; profil otomatis dibuat di tabel `profiles` saat pertama login.
  - AC: Tidak ada form input GitHub Token manual di registrasi.
- **US-02** — Sebagai leader, saya ingin melihat daftar anggota timku beserta role-nya, supaya bisa membagi task dengan tepat.

### 9.2 Milestone Management
- **US-03** — Sebagai leader, saya ingin membuat Milestone dengan PIC dan target tanggal, supaya target strategis tercatat jelas.
  - AC: Field wajib: judul, tanggal mulai, tanggal target. PIC opsional saat draft, wajib sebelum status `in_progress`.
- **US-04** — Sebagai leader, saya ingin melihat semua Project di bawah satu Milestone, supaya tahu progres keseluruhan.

### 9.3 Project Management
- **US-05** — Sebagai leader, saya ingin membuat Project di bawah Milestone tertentu dan menautkannya ke satu tim, supaya pekerjaan terorganisir per tim.
  - AC: Project wajib punya `milestone_id` dan `team_id` saat dibuat.

### 9.4 Task & Kanban Board
- **US-06** — Sebagai leader, saya ingin membuat Task baru (termasuk dari komplain CS) dan meng-assign ke anggota, supaya pekerjaan terdistribusi.
  - AC: Jika `origin = cs_complaint`, field `origin_note` wajib diisi.
  - AC: Hanya user dengan role `leader` yang bisa membuat Task (di-enforce via RLS, bukan cuma UI).
- **US-07** — Sebagai member, saya ingin drag-and-drop kartu Task antar kolom, supaya update status cepat tanpa buka form.
- **US-08** — Sebagai leader, saya ingin mengatur/mengurutkan kolom Kanban per Project, supaya alur kerja bisa disesuaikan (tidak melulu To Do/In Progress/Review/Done).
- **US-09** — Sebagai anggota tim, saya ingin berdiskusi di thread komentar tiap kartu Task, supaya konteks pekerjaan tidak hilang.

### 9.5 Dashboard Performa
- **US-10** — Sebagai leader, saya ingin memfilter dashboard berdasarkan tim/tahun/kuartal, supaya bisa fokus ke periode pelaporan tertentu.
- **US-11** — Sebagai leader, saya ingin melihat tren penyelesaian bulanan dan % selesai kuartal ini vs sebelumnya, supaya siap untuk Town Hall.

### 9.6 Workload & Capacity Management
- **US-12** — Sebagai leader, saya ingin melihat persentase kapasitas tiap anggota (berbasis jumlah task × bobot priority), supaya pembagian kerja seimbang.
  - AC: Formula: `sum(weight task aktif milik user) / capacity_settings.baseline_points`.
  - AC: Member dengan hasil > 80% ditandai **overload** secara visual di dashboard.

### 9.7 Integrasi GitHub
- **US-13** — Sebagai member engineering, saya ingin menautkan nama branch ke Task, supaya progres kode terlacak otomatis.
- **US-14** — Sebagai leader, saya ingin melihat riwayat commit yang terkait suatu Task langsung di halaman detail Task, tanpa buka GitHub terpisah.

### 9.8 Fitur AI
- **US-15** — Sebagai leader, saya ingin bertanya ke chatbot ("siapa yang beban kerjanya di bawah 50%?") dan mendapat jawaban berbasis data real-time.
- **US-16** — Sebagai leader, saya ingin AI menyarankan priority & estimasi durasi saat membuat Task baru, supaya keputusan lebih cepat.
- **US-17** — Sebagai leader, saya ingin mendapat peringatan otomatis menjelang akhir kuartal jika ada penumpukan Task belum selesai.
- **US-18** — Sistem meng-cache jawaban chatbot untuk query yang mirip, supaya biaya panggilan API LLM lebih hemat.

### 9.9 Notifikasi & Activity Log
- **US-19** — Sebagai member, saya ingin dapat notifikasi in-app saat di-assign ke Task baru, disebut di komentar, atau status Task-nya berubah, supaya tidak ketinggalan info.
- **US-20** — Sebagai leader, saya ingin dapat notifikasi saat ada anggota timnya masuk status overload.
- **US-21** — Sebagai leader, saya ingin melihat activity log tiap Task (siapa mengubah apa, kapan), supaya ada jejak audit kalau ada perubahan mendadak.
  - AC: Setiap perubahan field penting pada Task (assignee, priority, kolom/status, due date) tercatat otomatis ke `activity_log`, tidak bisa diedit/dihapus manual.

### 9.10 Manajemen Anggota Tim
- **US-22** — Sebagai leader, saya ingin mengundang anggota baru ke timnya (Aegis/Sentinel) lewat email, supaya composisi tim terkelola tanpa akses database manual.
- **US-23** — Sebagai leader, saya ingin mengubah role anggota (leader/member) dalam timnya sendiri.
  - AC: Leader hanya bisa invite/atur role untuk anggota di timnya sendiri, bukan tim lain.

### 9.11 Attachment & Search
- **US-24** — Sebagai user, saya ingin melampirkan file (screenshot, dokumen) ke Task, supaya konteks komplain/pekerjaan lengkap.
  - AC: File disimpan di Supabase Storage, ada batas ukuran & tipe file yang diizinkan.
- **US-25** — Sebagai user, saya ingin mencari Task berdasarkan judul, assignee, atau priority, supaya cepat menemukan Task tertentu di antara banyak Project.

### 9.12 Task Dependencies
- **US-26** — Sebagai leader, saya ingin menandai satu Task "blocked by" Task lain, supaya urutan pengerjaan yang saling bergantung jelas.
  - AC: Task dengan dependency yang belum selesai ditandai visual "blocked" di Kanban.
  - AC: *(perlu diputuskan — lihat §19)* apakah dependency yang belum selesai mem-block pindah ke kolom "Done" secara hard, atau cukup warning.

### 9.13 Export Laporan
- **US-27** — Sebagai leader, saya ingin mengekspor dashboard performa (grafik & ringkasan angka) ke PDF/Excel, supaya bisa langsung dipakai jadi materi Town Hall tanpa rekap ulang manual.

### 9.14 AI Guardrails
- **US-28** — Sebagai leader, saya ingin saran priority & estimasi durasi dari AI ditampilkan sebagai default yang bisa aku edit, bukan langsung diterapkan otomatis, supaya keputusan akhir tetap di tanganku.
  - AC: Setiap kali leader override saran AI, sistem mencatat versi asli vs versi final — berguna buat evaluasi akurasi AI ke depannya.

### 9.15 Archiving
- **US-29** — Sebagai leader, saya ingin mengarsipkan Milestone/Project yang sudah selesai, supaya dashboard & listing tetap fokus ke yang masih aktif.
  - AC: Item ter-archive tidak tampil di listing utama tapi tetap bisa dicari/diakses, dan tidak dihapus permanen dari database.

## 10. Matriks Hak Akses

| Aksi | Leader | Member |
|---|:---:|:---:|
| Buat/edit Milestone | ✅ | ❌ |
| Buat/edit Project | ✅ | ❌ |
| Buat Task (normal) | ✅ | ❌ |
| Buat Task (dari komplain CS) | ✅ | ❌ |
| Update status Task (drag-and-drop) | ✅ | ✅ (task milik sendiri) |
| Atur kolom Kanban | ✅ | ❌ |
| Komentar di Task | ✅ | ✅ |
| Tautkan branch GitHub ke Task | ✅ | ✅ (task milik sendiri) |
| Lihat dashboard performa tim | ✅ | ✅ (view-only) |
| Pakai chatbot AI | ✅ | ❓ *(belum diputuskan — lihat §19)* |
| Undang/atur role anggota tim | ✅ (tim sendiri) | ❌ |
| Upload attachment ke Task | ✅ | ✅ (task milik sendiri) |
| Tandai Task dependency | ✅ | ❌ |
| Export laporan dashboard | ✅ | ❌ |
| Arsipkan Milestone/Project | ✅ | ❌ |
| Override saran AI | ✅ | ❌ |

## 11. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Responsivitas** | UI mobile-friendly, dashboard & Kanban bisa diakses dari ponsel. |
| **Keamanan Data** | Token GitHub disimpan terenkripsi. Semua input dari client diverifikasi dengan **Zod** schema sebelum mutasi database. Pencegahan serangan *brute-force*/*abuse* dengan **Rate Limiting** di level API Route. Akses langsung DB ditutup (wajib via API/Pooler). |
| **Otorisasi (RLS)** | *Enforcement role* via RLS (Row Level Security) Supabase secara ketat. Tidak cukup hanya validasi di frontend. |
| **Performa & Skalabilitas** | Query agregasi workload di-*index* optimal (`assignee_id`, `project_id`). Wajib menggunakan mekanisme **Pagination / Infinite Scroll** untuk Kanban dan tabel Task demi menghindari memory bloat di sisi client. Menggunakan **Connection Pooling** (PgBouncer) untuk Supabase. |
| **Ketersediaan** | Aplikasi internal, target uptime jam kerja tim. Fitur eksperimental (AI, integrasi GitHub) harus dibungkus dengan **Feature Flags** agar bisa dimatikan mandiri jika terjadi anomali, tanpa down-time aplikasi. |
| **Biaya AI** | Wajib ada caching layer di depan pemanggilan LLM untuk query chatbot serupa. |
| **Background Jobs** | Proses I/O berat seperti ekspor PDF/Excel atau sinkronisasi GitHub history harus dijalankan secara **asinkron (background jobs/queues)** dan tidak boleh memblokir *UI thread* utama. |
| **Observabilitas** | Mengintegrasikan tools monitoring & error tracking (contoh: Sentry) untuk mencatat *unhandled exceptions* secara *real-time* di production. |
| **Manajemen Data** | Menerapkan prinsip **Soft Deletes** (`deleted_at`) pada seluruh entitas utama (Task, Project, Milestone) untuk mencegah hilangnya jejak audit (Activity Log). Tidak ada *hard delete* langsung. |
| **Testing** | Unit test untuk logic bisnis kritis (perhitungan workload, dependency check, AI caching); User Acceptance Test bareng leader di akhir tiap fase, sebelum demo mingguan. |
| **Environment** | Tiga environment terpisah — development, staging, production; deploy ke staging otomatis dari branch utama, promosi ke production manual setelah UAT. |
| **Storage** | Attachment file disimpan di object storage (Supabase Storage) dengan validasi batas ukuran & tipe file ketat dari sisi server. |

## 12. Model Data

Skema lengkap: lihat `schema.sql` (dibuat sebelumnya di percakapan ini). Ringkasan entitas:

```
teams ─┬─< profiles (role: leader/member)
       └─< projects >─ milestones
                │
                └─< board_columns >─< tasks >─< task_comments
                                        │  ├─< github_commits
                                        │  ├─< task_attachments
                                        │  ├─< task_dependencies (self-referencing: blocks/blocked_by)
                                        │  └─< activity_log
                                        └── priority_levels (weight)
profiles ─< github_integrations
profiles/teams ─< capacity_settings, ai_warnings, notifications
                   ai_query_cache (independen, keyed by query hash)
```

> Tabel baru dari penambahan fitur (belum ada di `schema.sql` versi awal): `task_attachments`, `task_dependencies`, `activity_log`, `notifications`, plus kolom `archived_at` di `milestones` dan `projects`. Perlu update `schema.sql` menyusul.

## 13. Alur Pengguna Utama

**Alur 1 — Leader menyusun target kuartalan:**
Leader login → buat Milestone (target tahunan) → buat beberapa Project di bawahnya, masing-masing ditautkan ke tim Aegis/Sentinel → buat Task di tiap Project, assign ke anggota → anggota mengerjakan lewat Kanban.

**Alur 2 — Task dari komplain CS:**
Leader menerima info komplain (di luar sistem) → leader buat Task baru dengan `origin = cs_complaint` dan catatan asal komplain → assign ke anggota relevan → progres dipantau sama seperti Task biasa.

**Alur 3 — Leader menyiapkan laporan Town Hall:**
Leader buka Dashboard → filter tim + kuartal berjalan → lihat % selesai, tren bulanan, status overload anggota → (opsional) tanya chatbot AI untuk insight tambahan → screenshot/ekspor untuk materi Town Hall.

## 14. Daftar Halaman / Layar

1. **Login** — manual + OAuth Google/GitHub
2. **Dashboard Performa** — filter tim/tahun/kuartal, grafik tren, ringkasan workload
3. **Daftar Milestone** — list + detail (Project di dalamnya)
4. **Detail Project** — info Project + papan Kanban
5. **Kanban Board** — kolom custom, drag-and-drop kartu Task
6. **Detail Task** — form info, discussion thread, riwayat commit GitHub
7. **Workload/Capacity View** — daftar anggota tim dengan % kapasitas & status overload
8. **Chatbot AI Panel** — bisa berupa side panel di Dashboard
9. **Pengaturan Profil** — link akun GitHub, info tim
10. **Manajemen Anggota Tim** — invite anggota, atur role (khusus leader)
11. **Arsip** — daftar Milestone/Project yang sudah di-archive
12. **Notifikasi** — pusat notifikasi in-app (bell icon), termasuk riwayat activity log per Task di halaman Detail Task

## 15. Rencana Rilis & Timeline

Total durasi: **4 bulan**, evaluasi via **demo mingguan tiap Senin**. Pembagian fase di bawah ini adalah **usulan**, silakan disesuaikan dengan arahan supervisor.

| Fase | Durasi | Fokus | Deliverable Demo |
|---|---|---|---|
| **Fase 1** | Bulan 1 | Setup Next.js + Supabase (dev/staging/production), Auth, CRUD Milestone/Project/Task, Kanban dasar (drag-and-drop, kolom custom, task dependencies), manajemen anggota tim (invite/role) | Board Kanban fungsional + tim bisa invite anggota |
| **Fase 2** | Bulan 2 | Dashboard performa, workload/capacity calculation, RLS policy per role, notifikasi & activity log, attachment & search, export laporan, archiving | Dashboard live + export PDF/Excel |
| **Fase 3** | Bulan 3 | Integrasi GitHub (OAuth link, webhook commit, tampil di detail Task) | Task ter-link ke commit GitHub asli |
| **Fase 4** | Bulan 4 | Fitur AI (chatbot, auto-prioritizing dengan guardrail/override, AI warning, caching), UAT & polish | Demo end-to-end + chatbot AI |

> Unit test ditulis berjalan seiring tiap fase (bukan fase terpisah); UAT bareng leader dilakukan di akhir tiap fase, sebelum demo mingguan Senin.

## 16. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Scope fitur AI cukup besar untuk sisa waktu di Fase 4 | Fitur AI terburu-buru / tidak sempat | Taruh fitur AI di fase terakhir (sudah dijadwalkan), siapkan fallback: chatbot dasar dulu, auto-prioritizing menyusul jika waktu kurang. Gunakan Feature Flag. |
| Tagihan AI LLM meledak / *Abuse* API | Biaya membengkak | Terapkan *Rate Limiting* per *user/IP* di API route AI, ditambah lapisan *Query Caching*. |
| Rate limit GitHub API | Commit history telat update / gagal fetch | Gunakan webhook (bukan polling terus-menerus), jalankan sebagai *background job*, tambahkan retry & caching. |
| Kesalahpahaman requirement (seperti kasus "Aegis" vs "IG" sebelumnya) | Implementasi salah arah | PRD ini jadi acuan tunggal, validasi ulang tiap ada requirement baru sebelum masuk sprint |
| Token GitHub/akses bocor atau koneksi DB terekspos | Risiko keamanan fatal | Enkripsi at-rest, RLS ketat, tutup *direct DB access* (wajib via pooler), token tidak pernah dikirim ke client. |
| Load rendering membebani client (Ribuan Task) | Aplikasi *lagging*/hang | Terapkan *Pagination/Infinite Scroll* pada Kanban dan hindari fetch semua data di awal. |
| Scope bertambah banyak (notifikasi, attachment, dependency, export, archiving) di Fase 1–2 | Fase 1–2 jadi padat, berisiko molor | Prioritaskan CRUD + Kanban dulu di awal Fase 1, fitur pendukung (search, export, archiving) menyusul di paruh kedua Fase 2 kalau perlu digeser |

## 17. Dependensi & Asumsi

- **Asumsi:** Auth memakai Supabase Auth secara langsung (bukan NextAuth) — perlu konfirmasi final dari leader/supervisor.
- **Asumsi:** Semua Task (bukan cuma dari CS) tetap dibuat/di-assign oleh Leader, member tidak bisa membuat Task sendiri.
- **Dependensi:** Ketersediaan API key LLM provider untuk fitur AI (chatbot, auto-prioritizing).
- **Dependensi:** Akses GitHub App/OAuth App perlu didaftarkan di level organisasi GitHub perusahaan.

## 18. Definition of Done (MVP)

- [ ] Leader bisa membuat & mengelola Milestone → Project → Task end-to-end
- [ ] Kanban board drag-and-drop dengan kolom custom per Project
- [ ] Dashboard performa dengan filter tim/tahun/kuartal menampilkan data real
- [ ] Workload capacity terhitung otomatis dan menandai overload
- [ ] Task engineering ter-link ke branch & commit GitHub
- [ ] Chatbot AI bisa menjawab query beban kerja dasar
- [ ] RLS aktif — member tidak bisa membuat Milestone/Project/Task
- [ ] Notifikasi in-app aktif untuk assignment, mention, dan overload warning
- [ ] Leader bisa invite anggota & atur role dalam timnya
- [ ] Attachment bisa diunggah ke Task, dan Task bisa dicari berdasarkan judul/assignee/priority
- [ ] Task dependency ("blocked by") bisa ditandai dan tampil visual di Kanban
- [ ] Dashboard bisa diekspor ke PDF/Excel
- [ ] Milestone/Project selesai bisa diarsipkan tanpa terhapus permanen
- [ ] Saran AI (priority/durasi) bisa di-override leader, dan override tercatat

## 19. Open Questions

1. Apakah Auth final pakai Supabase Auth saja, atau tetap butuh NextAuth di atasnya?
2. Apakah Member juga boleh akses chatbot AI, atau fitur ini khusus Leader?
3. Apakah kolom Kanban default direplikasi otomatis ke Project baru, atau harus dibuat manual tiap kali?
4. Apakah dibutuhkan role tambahan (mis. Admin lintas-tim) di luar Leader/Member?
5. Snapshot historis workload — dibutuhkan sekarang atau cukup dihitung on-the-fly dulu untuk MVP?
6. Task dependency yang belum selesai — mem-block pindah ke kolom "Done" secara hard, atau cukup warning visual saja?
7. Notifikasi cukup in-app, atau perlu juga lewat email/Slack untuk hal urgent (mis. overload warning)?
8. Format export laporan — PDF saja, Excel/CSV saja, atau dua-duanya wajib ada di MVP?
9. Attachment disimpan berapa lama / ada batas ukuran file berapa?

## 20. Lampiran

- `schema.sql` — skema database Postgres/Supabase awal (tabel, relasi, index). **Perlu di-update** dengan tabel baru: `task_attachments`, `task_dependencies`, `activity_log`, `notifications`, serta kolom `archived_at` pada `milestones`/`projects` — menyusul sesuai fitur di §9.9–9.15.