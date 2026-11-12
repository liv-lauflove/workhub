# Skema Basis Data & Row Level Security (RLS)

Basis data **Workhub** berjalan di atas **PostgreSQL (Supabase Cloud)** dan terdiri atas **18 tabel utama** yang dikelola melalui sistem migrasi berurutan di `supabase/migrations/`.

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    TEAMS ||--o{ PROFILES : "memiliki anggota"
    TEAMS ||--o{ PROJECTS : "menaungi proyek"
    TEAMS ||--o{ TEAM_INVITATIONS : "mengundang ke"
    TEAMS ||--o| CAPACITY_SETTINGS : "memiliki baseline"
    TEAMS ||--o{ AI_WARNINGS : "menerima peringatan"

    PROFILES ||--o{ MILESTONES : "membuat / PIC"
    PROFILES ||--o{ PROJECTS : "membuat / PIC"
    PROFILES ||--o{ TASKS : "membuat / dev / tester"
    PROFILES ||--o| GITHUB_INTEGRATIONS : "menautkan akun"
    PROFILES ||--o{ TASK_SUBTASKS : "menguji checklist"
    PROFILES ||--o{ TASK_COMMENTS : "menulis komentar"
    PROFILES ||--o{ TASK_ATTACHMENTS : "mengunggah berkas"
    PROFILES ||--o{ ACTIVITY_LOG : "melakukan aksi"
    PROFILES ||--o{ NOTIFICATIONS : "menerima notifikasi"
    PROFILES ||--o{ TEAM_INVITATIONS : "mengirim undangan"

    MILESTONES ||--o{ PROJECTS : "memuat proyek"

    PROJECTS ||--o{ BOARD_COLUMNS : "memiliki kolom"
    PROJECTS ||--o{ TASKS : "memuat task"

    BOARD_COLUMNS ||--o{ TASKS : "menampung kartu"

    TASKS ||--o{ TASK_SUBTASKS : "memiliki checklist QA"
    TASKS ||--o{ TASK_COMMENTS : "memiliki diskusi"
    TASKS ||--o{ TASK_ATTACHMENTS : "memiliki lampiran"
    TASKS ||--o{ ACTIVITY_LOG : "mencatat riwayat"
    TASKS ||--o{ GITHUB_COMMITS : "mencatat commit"
    TASKS ||--o{ NOTIFICATIONS : "memicu notifikasi"
    TASKS ||--o{ AI_SUGGESTION_OVERRIDES : "mencatat override AI"
    TASKS ||--o{ TASK_DEPENDENCIES : "bergantung pada"
    PRIORITY_LEVELS ||--o{ TASKS : "menentukan bobot"

    TEAMS {
        uuid id PK
        text name UK "min 2 karakter"
        timestamptz created_at
    }

    PROFILES {
        uuid id PK
        text full_name
        user_role role "leader | member"
        uuid team_id FK
        text position
        int capacity_points "default 40"
        text phone
        text github_username
        text avatar_url
        timestamptz created_at
    }

    TASKS {
        uuid id PK
        uuid project_id FK
        uuid column_id FK
        text title
        text description
        uuid assignee_id FK
        uuid developer_id FK
        uuid tester_id FK
        task_purpose purpose "development | testing | full_lifecycle"
        task_dev_status dev_status "todo | in_progress | dev_done"
        task_test_status test_status "pending | testing | passed | failed"
        text test_notes
        text priority FK "critical | high | medium | low"
        int base_points "default 20"
        task_origin origin "normal | cs_complaint"
        text origin_note
        text github_branch
        text github_repo
        date due_date
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_SUBTASKS {
        uuid id PK
        uuid task_id FK
        text title
        boolean is_completed
        uuid tested_by FK
        timestamptz tested_at
        int sort_order
        timestamptz created_at
    }
```

---

## 2. Daftar Tabel & Spesifikasi Domain

### A. Organisasi, Profil, & Kapasitas

1. **`teams`**: Menyimpan unit tim/squad organisasi (misal: `Aegis`, `Sentinel`, `Management`, serta tim baru yang dibuat secara dinamis oleh otoritas Management dengan batasan `CHECK (length(trim(name)) >= 2)`).
   - Tim **`Management`** (`id: e3333333-3333-3333-3333-333333333333`) berfungsi sebagai otoritas lintas-tim (Head of Tech / Executive) dan diproteksi agar namanya tidak dapat diubah atau dihapus.
2. **`profiles`**: Memperluas `auth.users` Supabase dengan atribut aplikasi: `full_name`, `role` (`leader` | `member`), `team_id`, `position` (jabatan teknis), `capacity_points` (kapasitas poin individu, default `40`), `phone`, `github_username`, dan `avatar_url`.
3. **`team_invitations`**: Menyimpan undangan anggota tim berbasis email dengan token unik, status (`pending`, `accepted`, `expired`, `revoked`), dan masa berlaku 7 hari.
4. **`priority_levels`**: Tabel referensi bobot prioritas untuk kalkulasi beban kerja (`critical = 4`, `high = 3`, `medium = 2`, `low = 1`).
5. **`capacity_settings`**: Menyimpan _baseline_ kapasitas poin standar per tim (`baseline_points`, default `20`).

### B. Hierarki Kerja (Milestone, Project, Kanban, Task)

6. **`milestones`**: Target strategis tingkat atas lintas tim. Memiliki `status` (`planned`, `in_progress`, `completed`, `at_risk`), `pic_id`, `start_date`, `target_date`, dan dukungan pengarsipan (`archived_at`).
7. **`projects`**: Proyek kerja yang menginduk pada satu `milestone_id` dan terikat ke satu `team_id`. Memiliki `status` (`planned`, `in_progress`, `completed`, `blocked`) dan `archived_at`.
8. **`board_columns`**: Kolom papan Kanban kustom per proyek (`position` terurut, misal: _To Do_, _In Progress_, _Review / QA_, _Done_).
9. **`tasks`**: Unit pekerjaan utama di papan Kanban. Mendukung:
   - **Dual-Assignee & Alur QA**: `developer_id`, `tester_id`, `purpose` (`development`, `testing`, `full_lifecycle`), `dev_status` (`todo`, `in_progress`, `dev_done`), `test_status` (`pending`, `testing`, `passed`, `failed`), dan `test_notes`.
   - **Pelacakan Komplain CS**: `origin` (`normal` | `cs_complaint`) dengan constraint wajib `origin_note` apabila berasal dari komplain CS.
   - **Isolasi GitHub Multi-Repo**: `github_branch` dan `github_repo` (nama repo atau `owner/repo` untuk mencegah bentrok nama branch antar-repositori).
10. **`task_subtasks`**: Daftar periksa (_checklist_) pengujian per task yang mencatat status selesai (`is_completed`), penguji (`tested_by`), dan waktu pengujian (`tested_at`).
11. **`task_dependencies`**: Relasi ketergantungan antar-task (`task_id` menunggu `depends_on_task_id` selesai), dilengkapi constraint anti-self-dependency (`task_id <> depends_on_task_id`).
12. **`task_comments`**: Diskusi berulir pada halaman detail task.
13. **`task_attachments`**: Metadata lampiran berkas yang disimpan di bucket Supabase Storage `task-attachments` (batas ukuran 5 MB).
14. **`activity_log`**: Catatan audit otomatis untuk setiap perubahan field penting pada task (`column_id`, `priority`, `assignee_id`, `due_date`, `title`, `description`, `project_id`, `github_branch`, `github_repo`).

### C. Integrasi GitHub, Notifikasi, & Kecerdasan Buatan (AI)

15. **`github_integrations`**: Menyimpan token akses OAuth GitHub pengguna untuk integrasi API.
16. **`github_commits`**: Menyimpan riwayat commit GitHub yang disinkronkan melalui webhook push (`task_id`, `commit_sha`, `commit_message`, `author_username`, `committed_at`, `url`), dengan constraint unik `(task_id, commit_sha)` agar idempoten.
17. **`notifications`**: Notifikasi dalam aplikasi (_in-app_) untuk kejadian `task_assigned`, `comment_mention`, `due_soon`, `overdue`, dan `ai_warning`.
18. **`ai_query_cache`**, **`ai_warnings`**, & **`ai_suggestion_overrides`**:
    - `ai_query_cache`: Menyimpan _hash_ pertanyaan dan respons AI untuk menghemat pemanggilan LLM berulang.
    - `ai_warnings`: Peringatan risiko beban kerja dan kuartalan dari asisten AI.
    - `ai_suggestion_overrides`: Mencatat perbandingan saran prioritas/durasi dari AI dengan keputusan akhir yang dipilih oleh Leader.

---

## 3. Database Triggers Otomatis

| Nama Trigger               | Tabel Target   | Fungsi & Perilaku                                                                                                                                                                                                                                                                                                                                                                                 |
| :------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `on_auth_user_created`     | `auth.users`   | Menjalankan `public.handle_new_user()` untuk membuat baris `profiles` secara otomatis saat pengguna baru mendaftar, serta mencocokkan undangan pending di `team_invitations`.                                                                                                                                                                                                                     |
| `before_task_write_guards` | `public.tasks` | Menjalankan `public.enforce_task_write_guards()` (`BEFORE INSERT OR UPDATE`) untuk menegakkan konsistensi kolom Kanban dengan project, memvalidasi keanggotaan tim assignee/developer/tester, membatasi perubahan field sensitif berdasarkan peran (Leader, Developer, Tester QA), serta memblokir kelulusan QA (`passed` / kolom `Done`) jika masih ada item `task_subtasks` yang belum selesai. |
| `on_task_activity_updated` | `public.tasks` | Menjalankan `public.log_task_activity()` (`AFTER UPDATE`) untuk membandingkan nilai lama (`OLD`) dan nilai baru (`NEW`) pada 9 kolom utama task dan menyisipkan riwayat perubahan ke `public.activity_log`.                                                                                                                                                                                       |

---

## 4. Arsitektur Row Level Security (RLS)

Seluruh tabel di skema `public` mengaktifkan **Row Level Security (`ENABLE ROW LEVEL SECURITY`)** dengan prinsip berikut:

1. Seluruh kebijakan RLS menggunakan `(select auth.uid())` alih-alih `auth.uid()` langsung agar PostgreSQL mengevaluasi sesi satu kali per query (_initPlan_), bukan per baris.
2. Pengguna dengan peran `authenticated` dapat membaca direktori profil, tim, milestone, project, dan task untuk kebutuhan kolaborasi lintas fungsi, sementara `notifications` dan `github_integrations` dibatasi ketat hanya untuk pemilik data (`user_id = (select auth.uid())`).
3. Otorisasi mutasi (`INSERT / UPDATE / DELETE`) dibagi menjadi tiga tingkatan:
   - **Management Team**: Memiliki hak akses lintas-squad untuk membuat/mengedit tim baru, mengelola proyek, dan menugaskan anggota.
   - **Leader Squad**: Memiliki hak membuat/mengubah Milestone, Project pada timnya, mengundang anggota ke timnya, serta mengatur kolom Kanban.
   - **Member Squad**: Memiliki hak memperbarui status pengerjaan task, menambahkan komentar, mengunggah lampiran, mencentang subtask pengujian, dan menautkan branch/repository GitHub.
4. Endpoint mesin-ke-mesin seperti `/api/github-webhook` menggunakan `createAdminClient()` setelah memverifikasi tanda tangan kriptografis HMAC-SHA256.

### Mutasi profil dan pengelolaan anggota

- Self-service `profiles` memakai policy baris milik sendiri dan grant UPDATE hanya untuk `full_name`, `avatar_url`, `github_username`, `phone`, serta `position`. Client tidak memiliki hak INSERT profil atau UPDATE langsung pada `id`, `role`, `team_id`, `capacity_points`, dan `created_at`.
- Trigger Auth tetap membuat profil; penetapan `team_id` dilakukan oleh operasi server yang terotorisasi. Verifikasi email pada klaim undangan dilacak terpisah pada issue #148.
- `public.update_team_member(p_user_id uuid, p_team_id uuid, p_role user_role default null, p_capacity_points integer default null)` mengembalikan UUID anggota yang diperbarui. RPC ini memakai `auth.uid()`, memeriksa role leader dan tim target, serta mengizinkan leader Management berdasarkan ID tim sistem untuk mengelola lintas tim. Tidak ada parameter actor atau pemindahan tim pada RPC ini.
- RPC menolak target yang tidak ditemukan, kapasitas di luar 10–1000, dan perubahan kosong. Pemeriksaan leader terakhir saat menurunkan role sendiri dilakukan dalam transaksi yang mengunci tim.
- Pengenalan Management untuk otorisasi memakai `MANAGEMENT_TEAM_ID`, bukan nama tim yang dapat berubah. Function berjalan sebagai `SECURITY DEFINER` dengan `search_path` kosong dan hanya dapat dipanggil role `authenticated` setelah pemeriksaan izin di dalam function.

Regresi Server Action dijalankan dengan `pnpm run test:profile-permissions`. Matriks izin database terdapat pada `supabase/tests/profile-permissions.test.sql` dan dapat dijalankan pada project Supabase development/test yang sudah menerima migrasi:

```powershell
pnpm exec supabase db query --linked --file supabase/tests/profile-permissions.test.sql
```

Tes database memakai identitas sintetis dan melakukan rollback terhadap seluruh fixture/helper. Kesalahan assertion menghasilkan error SQL, bukan status sukses tanpa pengujian.

### Mutasi task, kolom Kanban, dan checklist pengujian

- Fungsi helper otorisasi `public.is_project_leader(p_project_id uuid)`, `public.can_access_task_checklist(p_task_id uuid)`, dan `public.can_verify_task_checklist(p_task_id uuid)` berjalan sebagai `SECURITY DEFINER` dengan `search_path` kosong dan hanya dapat dieksekusi oleh `authenticated` serta `service_role`.
- **`public.board_columns`**: Hak `SELECT` tetap terbuka bagi `authenticated` untuk visibilitas lintas tim, sedangkan `INSERT`, `UPDATE (name, position, is_default)`, dan `DELETE` dibatasi hanya untuk Leader tim pemilik project atau Leader Tim Management (`public.is_project_leader(project_id)`).
- **`public.tasks`**:
  - `INSERT` dan `DELETE` hanya diizinkan untuk Leader project (`public.is_project_leader(project_id)`), dengan kewajiban `created_by = (select auth.uid())` dan `column_id` milik `project_id` yang sama.
  - `UPDATE` hanya diizinkan untuk Leader project atau pihak yang ditugaskan pada task (`assignee_id`, `developer_id`, `tester_id`), tanpa hak mengubah kolom identitas (`id`, `project_id`, `created_by`, `created_at`).
  - Trigger `before_task_write_guards` (`public.enforce_task_write_guards()`) memastikan `assignee_id`, `developer_id`, dan `tester_id` berasal dari tim project atau Tim Management, melarang non-leader mengubah `assignee_id`, `developer_id`, `priority`, `base_points`, `origin`, `due_date`, dan `purpose`, melarang Developer menetapkan `test_status = 'passed'` atau memindahkan task ke kolom `Done` sebelum lulus QA, serta mewajibkan seluruh item `task_subtasks` selesai (`is_completed = true`) sebelum task dinyatakan `passed`.
- **`public.task_subtasks`**:
  - Penambahan item baru (`is_completed = false`) dan penghapusan item yang belum dicentang dapat dilakukan oleh Leader project, Developer, atau Tester yang ditugaskan (`public.can_access_task_checklist(task_id)`).
  - Verifikasi/pencetakan checklist (`UPDATE` `is_completed`, `tested_by`, `tested_at`) dan penghapusan item yang sudah terverifikasi hanya dapat dilakukan oleh Tester QA yang ditugaskan atau Leader project (`public.can_verify_task_checklist(task_id)`), dengan validasi `tested_by = (select auth.uid())`.

Regresi Server Action dijalankan dengan `pnpm run test:task-kanban-checklist`, sedangkan verifikasi langsung di database dilakukan melalui:

```powershell
pnpm exec supabase db query --linked --file supabase/tests/task-kanban-checklist-rls.test.sql
```
