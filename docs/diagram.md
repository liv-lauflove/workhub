# Diagram Sistem: Workhub (Task & Performance Dashboard)

Dokumen ini berisi 3 diagram utama dalam format Mermaid:

1. ERD (Entity Relationship Diagram) untuk 18 tabel database beserta relasi, PK, dan FK.
2. Activity Diagram untuk 5 alur proses utama aplikasi (Perencanaan Target & Dual-Assignee QA, Komplain CS, Integrasi GitHub Multi-Repo, Chatbot AI & Guardrails, serta Manajemen Tim Dinamis).
3. Use Case Diagram untuk hak akses antara aktor Management Leader, Team Leader, Member (Developer / QA), serta Sistem Eksternal (GitHub & Gemini LLM).

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    TEAMS ||--o{ PROFILES : "memiliki anggota"
    TEAMS ||--o{ TEAM_INVITATIONS : "mengundang ke"
    TEAMS ||--|| CAPACITY_SETTINGS : "memiliki baseline"
    TEAMS ||--o{ PROJECTS : "mengerjakan"
    TEAMS ||--o{ AI_WARNINGS : "menerima peringatan"

    PROFILES ||--o| GITHUB_INTEGRATIONS : "menghubungkan token"
    PROFILES ||--o{ TEAM_INVITATIONS : "mengirim undangan"
    PROFILES ||--o{ MILESTONES : "menjadi PIC / pembuat"
    PROFILES ||--o{ PROJECTS : "menjadi PIC / pembuat"
    PROFILES ||--o{ TASKS : "ditugaskan (assignee / developer / tester)"
    PROFILES ||--o{ TASK_COMMENTS : "menulis"
    PROFILES ||--o{ TASK_ATTACHMENTS : "mengunggah"
    PROFILES ||--o{ ACTIVITY_LOG : "melakukan aksi"
    PROFILES ||--o{ NOTIFICATIONS : "menerima"
    PROFILES ||--o{ AI_WARNINGS : "menerima"
    PROFILES ||--o{ AI_SUGGESTION_OVERRIDES : "meng-override"

    MILESTONES ||--o{ PROJECTS : "menaungi"
    PROJECTS ||--o{ BOARD_COLUMNS : "memiliki kolom"
    PROJECTS ||--o{ TASKS : "memiliki task"
    BOARD_COLUMNS ||--o{ TASKS : "menempatkan"
    PRIORITY_LEVELS ||--o{ TASKS : "menentukan bobot"

    TASKS ||--o{ TASK_SUBTASKS : "memiliki checklist"
    TASKS ||--o{ TASK_COMMENTS : "memiliki diskusi"
    TASKS ||--o{ TASK_ATTACHMENTS : "memiliki lampiran"
    TASKS ||--o{ TASK_DEPENDENCIES : "bergantung pada"
    TASKS ||--o{ ACTIVITY_LOG : "mencatat perubahan"
    TASKS ||--o{ GITHUB_COMMITS : "terkait commit"
    TASKS ||--o{ NOTIFICATIONS : "memicu"
    TASKS ||--o{ AI_SUGGESTION_OVERRIDES : "dievaluasi AI"

    TEAMS {
        uuid id PK
        text name UK "Minimal 2 karakter (Aegis, Sentinel, atau tim baru)"
        timestamptz created_at
    }

    PROFILES {
        uuid id PK,FK "auth.users(id)"
        text full_name
        text email
        user_role role "leader | member"
        uuid team_id FK
        text phone
        text position "Management | Developer | QA | dll"
        int capacity_points "Default: 20"
        text github_username
        text avatar_url
        timestamptz created_at
    }

    TEAM_INVITATIONS {
        uuid id PK
        uuid team_id FK
        text email
        user_role role
        uuid invited_by FK
        text token UK
        invitation_status status "pending | accepted | expired | revoked"
        timestamptz created_at
        timestamptz expires_at
    }

    GITHUB_INTEGRATIONS {
        uuid id PK
        uuid user_id FK,UK
        text github_user_id
        text access_token "encrypted"
        text scope
        timestamptz connected_at
    }

    PRIORITY_LEVELS {
        text level PK "critical(4) | high(3) | medium(2) | low(1)"
        int weight
        int sort_order
    }

    CAPACITY_SETTINGS {
        uuid team_id PK,FK
        int baseline_points "Default: 20"
        timestamptz updated_at
    }

    MILESTONES {
        uuid id PK
        text title
        text description
        uuid pic_id FK
        date start_date
        date target_date
        milestone_status status "planned | in_progress | completed | at_risk"
        timestamptz archived_at
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECTS {
        uuid id PK
        uuid milestone_id FK
        uuid team_id FK
        text name
        text description
        uuid pic_id FK
        date start_date
        date end_date
        project_status status "planned | in_progress | completed | blocked"
        timestamptz archived_at
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    BOARD_COLUMNS {
        uuid id PK
        uuid project_id FK
        text name
        int position
        boolean is_default
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
        text dev_status
        text test_status
        text priority FK
        int base_points
        task_origin origin "normal | cs_complaint"
        text origin_note
        text github_branch
        text github_repo "owner/repo"
        date start_date
        date due_date
        int position
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_SUBTASKS {
        uuid id PK
        uuid task_id FK
        text title
        boolean is_completed
        int position
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_COMMENTS {
        uuid id PK
        uuid task_id FK
        uuid author_id FK
        text content
        timestamptz created_at
    }

    TASK_ATTACHMENTS {
        uuid id PK
        uuid task_id FK
        uuid uploaded_by FK
        text file_url
        text file_name
        text file_type
        int file_size
        timestamptz created_at
    }

    TASK_DEPENDENCIES {
        uuid id PK
        uuid task_id FK
        uuid depends_on_task_id FK
        timestamptz created_at
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid task_id FK
        uuid actor_id FK
        text field_name
        text old_value
        text new_value
        timestamptz created_at
    }

    GITHUB_COMMITS {
        uuid id PK
        uuid task_id FK
        text commit_sha
        text commit_message
        text author_username
        timestamptz committed_at
        text url
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        notification_type type
        text title
        text body
        uuid related_task_id FK
        boolean is_read
        timestamptz created_at
    }

    AI_QUERY_CACHE {
        uuid id PK
        text query_hash UK
        text query_text
        text response_text
        timestamptz created_at
        timestamptz expires_at
    }

    AI_WARNINGS {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        text quarter
        text message
        timestamptz created_at
    }

    AI_SUGGESTION_OVERRIDES {
        uuid id PK
        uuid task_id FK
        text suggested_priority FK
        numeric suggested_duration_hours
        text final_priority FK
        numeric final_duration_hours
        uuid overridden_by FK
        timestamptz created_at
    }
```

---

## 2. Activity Diagram

### 2.1 Alur 1: Perencanaan Target, Pembuatan Task, Dual-Assignee QA, & Eksekusi Kanban

```mermaid
flowchart TD
    Start([Mulai]) --> Login[User Login via Email/Password atau OAuth Google/GitHub]
    Login --> AuthCheck{Cek Role di Supabase RLS}

    AuthCheck -- Leader --> CreateMilestone[Leader Membuat Milestone Strategis + Set PIC & Target Date]
    CreateMilestone --> CreateProject[Leader Membuat Project di bawah Milestone & Pilih Tim]
    CreateProject --> SetupBoard[Sistem Otomatis Membuat 4 Kolom Kanban Default]
    SetupBoard --> CreateTask[Leader Membuka Form Buat Task Baru]

    CreateTask --> AISuggest[AI Auto-Prioritizing: Sarankan Priority & Estimasi Durasi]
    AISuggest --> OverrideCheck{Leader Mengubah Saran AI?}
    OverrideCheck -- Ya --> LogOverride[Catat ke Tabel ai_suggestion_overrides]
    OverrideCheck -- Tidak --> AssignMember[Leader Assign Developer, Tester/QA, Dependency, & Subtasks]
    LogOverride --> AssignMember

    AssignMember --> SaveTask[Simpan Task ke Database & Trigger activity_log]
    SaveTask --> NotifyMember[Kirim Notifikasi In-App task_assigned]
    NotifyMember --> CalcWorkload[Hitung Ulang Workload: Bobot Task x Persentase Peran Dev 100% / QA 50%]

    CalcWorkload --> OverloadCheck{Workload > 80%?}
    OverloadCheck -- Ya --> FlagOverload[Tandai Status OVERLOAD & Kirim Notifikasi member_overload ke Leader]
    OverloadCheck -- Tidak --> ReadyKanban[Task Tampil di Kolom Kanban]
    FlagOverload --> ReadyKanban

    AuthCheck -- Member --> ViewKanban[Member Membuka Papan Kanban Project]
    ReadyKanban --> ViewKanban

    ViewKanban --> DragTask[Developer / Tester Drag-and-Drop Kartu Task & Checklist Subtasks]
    DragTask --> DepCheck{Ada Task Dependency Belum Selesai?}
    DepCheck -- Ya (ke Done) --> WarnDep[Tampilkan Indikator Blocked by Dependency]
    DepCheck -- Tidak --> UpdateCol[Update column_id, dev_status, atau test_status]
    WarnDep --> UpdateCol

    UpdateCol --> LogStatus[Catat Otomatis ke activity_log & Kirim Notifikasi task_status_changed]
    LogStatus --> End([Selesai])
```

### 2.2 Alur 2: Penanganan Task dari Komplain CS

```mermaid
flowchart TD
    Start([Komplain Masuk dari Tim CS]) --> LeaderReceive[Leader Menerima Info Komplain]
    LeaderReceive --> OpenForm[Leader Buat Task Baru & Pilih Origin = cs_complaint]
    OpenForm --> ValidateNote{Apakah origin_note Diisi?}
    ValidateNote -- Tidak --> ErrorNote[Tampilkan Validasi: Catatan Komplain Wajib Diisi]
    ErrorNote --> OpenForm
    ValidateNote -- Ya --> UploadProof[Leader Upload Bukti Screenshot/Dokumen ke Supabase Storage]
    UploadProof --> AISuggest[AI Menyarankan Priority & Estimasi Durasi]
    AISuggest --> AssignDev[Leader Assign ke Developer & Tester yang Kapasitasnya Tersedia]
    AssignDev --> TrackKanban[Task Dipantau di Kanban Board hingga Kolom Done]
    TrackKanban --> End([Selesai])
```

### 2.3 Alur 3: Integrasi GitHub Multi-Repository & Pelacakan Commit

```mermaid
flowchart TD
    Start([Developer Mengerjakan Task Engineering]) --> LinkBranch[Developer/Leader Input Nama Branch & Opsional Repository owner/repo]
    LinkBranch --> PushCode[Developer Push Commit ke Repository GitHub]
    PushCode --> WebhookTrigger[GitHub Mengirim Event Push ke /api/github-webhook]
    WebhookTrigger --> VerifySig{Verifikasi HMAC X-Hub-Signature-256 Valid?}
    VerifySig -- Tidak --> Reject401[Tolak Request 401 Unauthorized]
    VerifySig -- Ya --> MatchTask[Cari Task dengan github_branch = branch AND github_repo cocok atau NULL]
    MatchTask --> UpsertCommit[Simpan / Upsert Commit ke Tabel github_commits]
    UpsertCommit --> ViewDetail[Leader / Member Membuka Detail Task]
    ViewDetail --> ShowHistory[Tampilkan Riwayat Commit Beserta Badge Repository, Author, SHA, & Link GitHub]
    ShowHistory --> End([Selesai])
```

### 2.4 Alur 4: Penggunaan Chatbot AI (RAG) & Evaluasi Laporan Town Hall

```mermaid
flowchart TD
    Start([Leader Menyiapkan Materi Town Hall]) --> OpenDash[Buka Dashboard Performa]
    OpenDash --> FilterDash[Filter berdasarkan Tim, Tahun, dan Kuartal]
    FilterDash --> ViewMetrics[Lihat % Selesai Kuartal Ini vs Lalu, Tren Bulanan, & Workload Anggota]

    ViewMetrics --> AskAI{Butuh Insight Tambahan via Chatbot AI?}
    AskAI -- Ya --> InputQuery[Ketik Pertanyaan di Panel AI Assistant]
    InputQuery --> HashQuery[Normalisasi & Hitung SHA-256 Hash Query]
    HashQuery --> CheckCache{Cek ai_query_cache: Ada & Belum Expired?}
    CheckCache -- Ya --> ReturnCached[Kembalikan Jawaban dari Cache]
    CheckCache -- Tidak --> CallLLM[Bangun Konteks RAG Real-Time & Panggil Google Gemini]
    CallLLM --> SaveCache[Simpan Jawaban ke ai_query_cache]
    SaveCache --> ShowResponse[Tampilkan Jawaban di Panel Chatbot]
    ReturnCached --> ShowResponse

    AskAI -- Tidak --> ExportReport[Klik Export Laporan Dashboard ke CSV / PDF Print View]
    ShowResponse --> ExportReport
    ExportReport --> End([Siap Dipresentasikan di Town Hall])
```

### 2.5 Alur 5: Manajemen Tim Dinamis & Direktori Member (Menu "Member")

```mermaid
flowchart TD
    Start([User Membuka Menu Member di Sidebar]) --> DefaultTab[Tampil Tab Semua Tim Berupa Grid Kartu Tim]
    DefaultTab --> CheckPosition{Apakah User Role = Leader & Position = Management?}

    CheckPosition -- Ya --> ManageTeam[Tampil Tombol + Buat Tim Baru serta Aksi Edit & Hapus di Kartu Tim]
    ManageTeam --> TeamMutation[Buat / Ubah Nama Tim / Hapus Tim Kosong]
    TeamMutation --> DefaultTab

    CheckPosition -- Tidak --> ClickCard[User Klik Salah Satu Kartu Tim mis. Aegis atau Sentinel]
    ClickCard --> DrillDown[Beralih ke Tab Tim Terpilih & Tampilkan Tabel Anggota Tim Tersebut]
    DrillDown --> End([Selesai])
```

---

## 3. Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors["Aktor Pengguna"]
        Mgmt["Management Leader\n(role: leader, position: Management)"]
        Leader["Team Leader\n(role: leader)"]
        Member["Team Member\n(Developer / QA)"]
    end

    subgraph External["Sistem Eksternal"]
        GitHub["GitHub API & Webhook"]
        LLM["Google Gemini LLM"]
    end

    subgraph System["Workhub: Task & Performance Dashboard"]
        subgraph AuthTeam["1. Auth, Member & Dynamic Team"]
            UC_Login(["Login / Register (Email & OAuth)"])
            UC_ManageTeams(["Buat, Edit, & Hapus Tim"])
            UC_Invite(["Undang Anggota & Ubah Role"])
            UC_Profile(["Kelola Profil, Jabatan & Kapasitas"])
        end

        subgraph WorkHierarchy["2. Hierarki Kerja & Kanban"]
            UC_Milestone(["Kelola & Arsipkan Milestone"])
            UC_Project(["Kelola & Arsipkan Project"])
            UC_Columns(["Kustomisasi & Urutkan Kolom Kanban"])
            UC_CreateTask(["Buat Task (Normal & Komplain CS) + Dual-Assignee"])
            UC_Dep(["Atur Task Dependency & Subtasks"])
            UC_MoveTask(["Drag-and-Drop Status Task di Kanban"])
            UC_Collab(["Komentar, Upload Lampiran & Cari Task"])
            UC_Log(["Lihat Activity Log & Notifikasi In-App"])
        end

        subgraph EngPerf["3. Engineering & Performa"]
            UC_Branch(["Tautkan Branch & Repository GitHub ke Task"])
            UC_Commit(["Lihat Riwayat Commit di Detail Task"])
            UC_Dash(["Lihat Dashboard Performa & Workload"])
            UC_Export(["Export Laporan Dashboard (CSV / PDF)"])
        end

        subgraph AILayer["4. Fitur AI"]
            UC_Chat(["Tanya Chatbot AI (RAG Beban Kerja & Proyek)"])
            UC_AutoPrio(["Terima / Override Saran Priority & Durasi AI"])
            UC_Warn(["Terima AI Warning Penumpukan Task Kuartalan"])
        end
    end

    %% Relasi Management Leader
    Mgmt --> UC_ManageTeams
    Mgmt --> Leader

    %% Relasi Leader
    Leader --> UC_Login
    Leader --> UC_Invite
    Leader --> UC_Profile
    Leader --> UC_Milestone
    Leader --> UC_Project
    Leader --> UC_Columns
    Leader --> UC_CreateTask
    Leader --> UC_Dep
    Leader --> UC_MoveTask
    Leader --> UC_Collab
    Leader --> UC_Log
    Leader --> UC_Branch
    Leader --> UC_Commit
    Leader --> UC_Dash
    Leader --> UC_Export
    Leader --> UC_Chat
    Leader --> UC_AutoPrio
    Leader --> UC_Warn

    %% Relasi Member
    Member --> UC_Login
    Member --> UC_Profile
    Member --> UC_MoveTask
    Member --> UC_Collab
    Member --> UC_Log
    Member --> UC_Branch
    Member --> UC_Commit
    Member --> UC_Dash
    Member --> UC_Chat

    %% Relasi Sistem Eksternal
    UC_Branch -.-> GitHub
    GitHub -.->|"Push Webhook (Multi-Repo)"| UC_Commit
    UC_Chat -.-> LLM
    UC_AutoPrio -.-> LLM
    UC_Warn -.-> LLM
```
