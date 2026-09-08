# Diagram — Task & Performance Dashboard

Berisi: **ERD**, **Activity Diagram** (3 alur utama), dan **Use Case Diagram**.
Diagram ditulis dalam sintaks Mermaid — render otomatis di editor/viewer yang mendukung Mermaid (GitHub, Notion, VS Code + extension, dll).

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    TEAMS ||--o{ PROFILES : has
    TEAMS ||--o{ PROJECTS : scoped_to
    TEAMS ||--o{ TEAM_INVITATIONS : invites_to
    TEAMS ||--o| CAPACITY_SETTINGS : has
    TEAMS ||--o{ AI_WARNINGS : has

    PROFILES ||--o{ MILESTONES : creates
    PROFILES ||--o{ PROJECTS : creates
    PROFILES ||--o{ TASKS : creates_or_assigned
    PROFILES ||--o| GITHUB_INTEGRATIONS : links
    PROFILES ||--o{ TASK_COMMENTS : writes
    PROFILES ||--o{ TASK_ATTACHMENTS : uploads
    PROFILES ||--o{ ACTIVITY_LOG : performs
    PROFILES ||--o{ NOTIFICATIONS : receives
    PROFILES ||--o{ TEAM_INVITATIONS : sends

    MILESTONES ||--o{ PROJECTS : contains

    PROJECTS ||--o{ BOARD_COLUMNS : has
    PROJECTS ||--o{ TASKS : contains

    BOARD_COLUMNS ||--o{ TASKS : holds

    TASKS ||--o{ TASK_COMMENTS : has
    TASKS ||--o{ TASK_ATTACHMENTS : has
    TASKS ||--o{ ACTIVITY_LOG : logs
    TASKS ||--o{ GITHUB_COMMITS : links
    TASKS ||--o{ NOTIFICATIONS : triggers
    TASKS ||--o{ AI_SUGGESTION_OVERRIDES : has
    TASKS ||--o{ TASK_DEPENDENCIES : "depends on (self-referencing)"
    PRIORITY_LEVELS ||--o{ TASKS : weights

    TEAMS {
        uuid id PK
        text name
        timestamptz created_at
    }

    PROFILES {
        uuid id PK
        text full_name
        enum role
        uuid team_id FK
        text github_username
        timestamptz created_at
    }

    TEAM_INVITATIONS {
        uuid id PK
        uuid team_id FK
        text email
        enum role
        uuid invited_by FK
        enum status
        timestamptz expires_at
    }

    GITHUB_INTEGRATIONS {
        uuid id PK
        uuid user_id FK
        text github_user_id
        text access_token
        text scope
    }

    PRIORITY_LEVELS {
        text level PK
        int weight
        int sort_order
    }

    CAPACITY_SETTINGS {
        uuid team_id PK
        int baseline_points
    }

    MILESTONES {
        uuid id PK
        text title
        uuid pic_id FK
        date start_date
        date target_date
        enum status
        timestamptz archived_at
        uuid created_by FK
    }

    PROJECTS {
        uuid id PK
        uuid milestone_id FK
        uuid team_id FK
        text name
        uuid pic_id FK
        enum status
        timestamptz archived_at
        uuid created_by FK
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
        uuid assignee_id FK
        text priority FK
        enum origin
        text origin_note
        text github_branch
        date due_date
        uuid created_by FK
    }

    TASK_COMMENTS {
        uuid id PK
        uuid task_id FK
        uuid author_id FK
        text content
    }

    TASK_ATTACHMENTS {
        uuid id PK
        uuid task_id FK
        uuid uploaded_by FK
        text file_url
        text file_name
        int file_size
    }

    TASK_DEPENDENCIES {
        uuid id PK
        uuid task_id FK
        uuid depends_on_task_id FK
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid task_id FK
        uuid actor_id FK
        text field_name
        text old_value
        text new_value
    }

    GITHUB_COMMITS {
        uuid id PK
        uuid task_id FK
        text commit_sha
        text commit_message
        timestamptz committed_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        enum type
        text title
        uuid related_task_id FK
        boolean is_read
    }

    AI_QUERY_CACHE {
        uuid id PK
        text query_hash
        text query_text
        text response_text
    }

    AI_WARNINGS {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        text quarter
        text message
    }

    AI_SUGGESTION_OVERRIDES {
        uuid id PK
        uuid task_id FK
        text suggested_priority
        text final_priority
        uuid overridden_by FK
    }
```

---

## 2. Activity Diagram

### 2.1 Alur Task Normal (dibuat → selesai)

```mermaid
flowchart TD
    A([Mulai]) --> B[Leader buat Task baru]
    B --> C[AI menyarankan priority & estimasi durasi]
    C --> D{Leader setuju saran AI?}
    D -- Ya --> E[Priority & durasi AI dipakai]
    D -- Tidak --> F[Leader edit manual]
    F --> G[Sistem catat suggested vs final ke ai_suggestion_overrides]
    E --> H[Leader assign Task ke Member]
    G --> H
    H --> I[Notifikasi terkirim ke Member: task_assigned]
    I --> J[Member kerjakan, tautkan branch GitHub]
    J --> K[Member drag Task antar kolom Kanban]
    K --> L{Task punya dependency yang belum selesai?}
    L -- Ya --> M[Tandai visual 'blocked' di kartu]
    M --> K
    L -- Tidak --> N{Kolom tujuan = Done?}
    N -- Ya --> O[Task selesai]
    N -- Tidak --> P[Update status tersimpan]
    P --> Q[Activity log dicatat: perubahan kolom]
    Q --> K
    O --> Q2[Activity log dicatat: task selesai]
    Q2 --> R([Selesai])
```

### 2.2 Alur Task dari Komplain Customer Service

```mermaid
flowchart TD
    A([Mulai]) --> B[CS terima komplain di luar sistem]
    B --> C[CS teruskan info komplain ke Leader]
    C --> D[Leader buat Task baru dengan origin = cs_complaint]
    D --> E[Leader isi origin_note wajib]
    E --> F[Leader assign Task ke Member relevan]
    F --> G[Notifikasi terkirim ke Member]
    G --> H[Member kerjakan seperti Task biasa]
    H --> I[Progres dipantau via Kanban & Activity Log]
    I --> J([Selesai])
```

### 2.3 Alur Leader Menyiapkan Laporan Town Hall

```mermaid
flowchart TD
    A([Mulai]) --> B[Leader buka Dashboard Performa]
    B --> C[Filter berdasarkan tim, tahun, kuartal]
    C --> D[Sistem hitung % selesai, tren bulanan, workload real-time]
    D --> E{Perlu insight tambahan?}
    E -- Ya --> F[Leader tanya Chatbot AI]
    F --> G{Query mirip sudah pernah ditanya?}
    G -- Ya --> H[Jawab dari ai_query_cache]
    G -- Tidak --> I[Panggil LLM, simpan hasil ke cache]
    H --> J[Leader dapat jawaban]
    I --> J
    E -- Tidak --> J
    J --> K[Leader klik Export]
    K --> L[Sistem generate PDF/Excel dari data dashboard]
    L --> M[Leader pakai file untuk materi Town Hall]
    M --> N([Selesai])
```

---

## 3. Use Case Diagram

```mermaid
flowchart LR
    Leader["🧑‍💼 Leader"]
    Member["🧑‍💻 Member"]

    subgraph SYS["Sistem: Task & Performance Dashboard"]
        UC1(["Login (manual / Google / GitHub OAuth)"])
        UC2(["Kelola Milestone"])
        UC3(["Kelola Project"])
        UC4(["Buat & Assign Task"])
        UC5(["Buat Task dari Komplain CS"])
        UC6(["Atur Kolom Kanban"])
        UC7(["Update Status Task (Drag-and-Drop)"])
        UC8(["Komentar di Task"])
        UC9(["Upload Attachment"])
        UC10(["Cari Task"])
        UC11(["Tandai Task Dependency"])
        UC12(["Lihat Dashboard Performa"])
        UC13(["Export Laporan (PDF/Excel)"])
        UC14(["Arsipkan Milestone/Project"])
        UC15(["Tautkan Branch & Lihat Commit GitHub"])
        UC16(["Gunakan Chatbot AI"])
        UC17(["Terima Saran AI (priority/durasi)"])
        UC18(["Override Saran AI"])
        UC19(["Terima Peringatan AI Kuartalan"])
        UC20(["Undang & Atur Role Anggota Tim"])
        UC21(["Terima Notifikasi"])
        UC22(["Lihat Activity Log"])
    end

    Leader --> UC1
    Leader --> UC2
    Leader --> UC3
    Leader --> UC4
    Leader --> UC5
    Leader --> UC6
    Leader --> UC7
    Leader --> UC8
    Leader --> UC9
    Leader --> UC10
    Leader --> UC11
    Leader --> UC12
    Leader --> UC13
    Leader --> UC14
    Leader --> UC15
    Leader --> UC16
    Leader --> UC17
    Leader --> UC18
    Leader --> UC19
    Leader --> UC20
    Leader --> UC21
    Leader --> UC22

    Member --> UC1
    Member --> UC7
    Member --> UC8
    Member --> UC9
    Member --> UC10
    Member --> UC12
    Member --> UC15
    Member --> UC21

    UC4 -. include .-> UC21
    UC5 -. include .-> UC21
    UC4 -. include .-> UC17
    UC17 -. extend .-> UC18
    UC12 -. include .-> UC13
```

**Catatan akses Member ke Chatbot AI (UC16) dan Peringatan Kuartalan (UC19) belum dimasukkan** — masih open question di PRD §19 (poin 2).
