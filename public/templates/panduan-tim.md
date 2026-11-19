# Panduan Kerja Tim [Nama Tim]

Ganti `[Nama Tim]` dengan nama squad dan lengkapi setiap bagian bertanda kurung siku `[...]` sesuai prosedur tim. Unggah file `.md` (UTF-8, maksimal 64 KB) di `/settings/knowledge-base`, uji beberapa pertanyaan SOP pada form pratinjau, lalu terbitkan panduan setelah jawabannya akurat.

## Kriteria Done 100%, Subtask Checklist, dan Penyelesaian Task

Task hanya boleh masuk ke kolom `Done` apabila ketiga syarat berikut terpenuhi sekaligus:

1. Tahap development tuntas dengan status `dev_status = 'dev_done'`.
2. Tahap review pengujian QA dinyatakan lulus dengan status `test_status = 'passed'` melalui aksi `Merge Pull Request`.
3. Seluruh item checklist `task_subtasks` berstatus selesai (`is_completed = true`) dan telah diverifikasi oleh Tester QA yang ditugaskan atau Leader project.

Trigger database `before_task_write_guards` menolak pemindahan kartu ke kolom `Done` bila syarat tersebut belum lengkap. `[Tambahkan kriteria penyelesaian khusus tim jika ada, misalnya dokumentasi rilis atau verifikasi staging.]`

## Serah Terima Developer ke QA, Open PR, dan Alur Review

1. Developer menyelesaikan kode pada branch GitHub, menautkan `github_branch` dan `github_repo` di detail task, lalu menandai `Selesai Dev` (`dev_status = 'dev_done'`).
2. Developer membuka Pull Request lewat tombol `Open PR` dengan mengisi ringkasan perubahan, panduan pengujian QA pada `test_notes`, dan memilih Reviewer/Tester QA (bukan diri sendiri). Aksi ini mengubah `test_status = 'testing'` dan memindahkan bobot beban kerja aktif ke Tester QA.
3. Tester QA memeriksa perubahan dan memverifikasi checklist `task_subtasks`. Jika lolos, Tester klik `Merge Pull Request` agar task masuk ke `Done` dengan beban 0 poin.
4. Jika ditemukan bug atau kriteria belum terpenuhi, Tester klik `Request Changes` dengan catatan revisi wajib di `test_notes`. Status kembali ke `dev_status = 'in_progress'` dan `test_status = 'failed'`, lalu Developer memperbaiki dan mengajukan ulang PR.

`[Tuliskan bukti uji yang wajib dilampirkan tim dan target waktu respons review QA.]`

## Pencatatan dan Penanganan Komplain Customer Support (CS / cs_complaint)

Komplain dari Customer Support yang masuk lewat kanal eksternal dicatat ke Workhub dengan langkah berikut:

1. Buat task di project terkait dan tetapkan `origin = 'cs_complaint'`.
2. Isi field wajib `origin_note` secara ringkas: kanal laporan, kronologi kendala, dan dampak pengguna.
3. Lampirkan screenshot atau potongan log melalui `task_attachments` (maksimal 5 MB per berkas, tanpa kredensial atau rahasia).

`[Sebutkan PIC triase awal, aturan penetapan prioritas komplain, dan alur koordinasi penutupan tiket CS di tim.]`

## Eskalasi Task Critical, Insiden Urgent, dan Critical Watchlist (<72 Jam)

Eskalasi wajib dipicu saat task berprioritas `critical` atau `urgent`, task `high`/`critical` masuk `Critical Watchlist` (sisa deadline kurang dari atau sama dengan 72 jam / 3 hari, atau sudah terlewat), atau terdapat dependency lintas tim yang terhenti.

1. Tingkat 1: `[Peran Leader lapis pertama tim]` untuk unblock teknis dan penyesuaian urutan kerja.
2. Tingkat 2: `[Peran Principal atau Manager tim]` untuk realokasi beban internal atau perubahan prioritas sprint.
3. Tingkat 3: `Head of Tech` (Tim Management) untuk koordinasi lintas squad dan penyesuaian target Milestone.

Catat kronologi eskalasi pada komentar detail task agar terekam di `activity_log` dan memicu notifikasi `comment_mention`. `[Cantumkan kanal komunikasi darurat dan target waktu respons tim.]`

## Beban Kerja (Workload), Kapasitas Poin, dan Aturan Overload

Mesin workload Workhub memakai 2 poin dasar per task, dikalikan pengali prioritas (`critical`/`urgent` 2.0x, `high` 1.5x, `medium` 1.0x, `low` 0.5x) dan pengali sisa deadline (terlewat/overdue 2.0x, `Critical Watchlist <= 72 jam` 1.5x, normal 4 sampai 7 hari 1.0x, jangka panjang `> 7 hari` 0.7x, tanpa deadline 1.0x). Nilai 20 poin adalah cadangan kapasitas tim saat belum ada pengaturan kapasitas, terpisah dari bobot per task.

Acuan `capacity_points` individu di `/team` (rentang valid 10 sampai 1000 poin): member standar 100 poin, specialist 150 poin, leader atau principal 250 poin, dan manager atau head 300 poin. Status pada `/workload`:

- `Available` (`< 50%` kapasitas terpakai dan task aktif `<= 2`): kandidat utama penerima task baru.
- `Optimal` (`50%` sampai `80%`, peringatan `Mendekati Batas` mulai `70%` sampai `80%`): beban kerja seimbang.
- `Overload` (`> 80%` kapasitas): Leader dilarang menambah task prioritas tinggi baru ke anggota ini dan wajib meredistribusi beban.

`[Tambahkan aturan pembagian kapasitas khusus tim jika ada.]`

## Undangan Anggota Tim, Masa Berlaku Kedaluwarsa (Expired), dan Isolasi Akses

1. Undangan anggota baru dikirim melalui `/team` oleh Leader tim sendiri atau Leader Management dan berlaku selama 7 hari (`expires_at`).
2. Calon anggota wajib memverifikasi email (`email_confirmed_at`) agar klaim undangan atomik (`claim_team_invitation`) menetapkan `team_id` dan role secara aman.
3. Undangan pending yang melewati 7 hari otomatis berstatus `expired` dan dapat dikirim ulang ke email yang sama.
4. Pengguna non-Management hanya dapat mengakses data timnya sendiri pada halaman `/`, `/team`, dan `/workload`.

## Guardrail Asisten AI, Override Saran Prioritas, dan Larangan Akses Database Langsung

1. Asisten AI hanya bersifat penasihat dan tidak boleh mengubah task, memindahkan kartu Kanban, atau menugaskan anggota secara otomatis.
2. Saran prioritas dan estimasi durasi AI saat membuat task dapat diubah (override) oleh Leader; setiap perbedaan tercatat otomatis pada `ai_suggestion_overrides`.
3. Zero raw DB access: asisten AI tidak membaca tabel mentah database secara langsung. Ringkasan workload melewati agregator ter-sanitasi di server, sedangkan jawaban SOP hanya mengutip panduan terbit tim di `ai_knowledge_documents` (akses pilot SOP khusus role `leader`).
