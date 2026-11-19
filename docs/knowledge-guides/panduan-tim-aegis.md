> Draf untuk ditinjau. Konfirmasi prosedur khusus dengan Lead Aegis sebelum Leader Management menerbitkan panduan.

# Panduan Kerja Tim Aegis (Squad Software Engineering)

Panduan ini merangkum alur kerja Tim Aegis (Squad Software Engineering) di Workhub. Struktur peran Aegis terdiri atas `Tech Principal` dan `Tech Lead` sebagai Leader Aegis, serta `Tech Specialist` dan `Software Engineer` sebagai Member Aegis. Seluruh pekerjaan mengikuti hierarki `Milestone` -> `Project` (terikat ke Tim Aegis) -> `Task`. Member Aegis dapat membuat task baru di project milik Aegis, sedangkan pengelolaan kolom Kanban, task dependency, arsip, serta metadata prioritas dan jadwal menjadi wewenang Leader Aegis atau Tim Management.

## Alur Development, Git Branch Multi-Repo, dan Serah Terima Developer ke QA (Open PR)

Setiap task pengembangan pada Squad Aegis mengikuti tahapan berikut:

1. Developer (`developer_id` atau `assignee_id`) mengambil task dari `Backlog` atau `To Do`, memindahkannya ke `In Progress`, dan menetapkan `dev_status = 'in_progress'`.
2. Buat branch GitFlow dari cabang `dev` menggunakan format `feat/issue-<nomor>-<slug>` untuk fitur atau `fix/issue-<nomor>-<slug>` untuk perbaikan bug. Nama branch hanya boleh memakai huruf kecil, angka, tanda hubung (`-`), garis bawah (`_`), dan garis miring (`/`).
3. Tautkan `github_branch` dan `github_repo` (nama repositori atau format `owner/repo`) pada halaman detail task agar sinkronisasi webhook commit multi-repo tidak bentrok antar repositori.
4. Sebelum menandai `Selesai Dev`, Developer Aegis wajib memastikan `pnpm run lint`, `pnpm run build`, dan pengujian unit terkait lulus secara lokal tanpa galat, lalu melengkapi item `task_subtasks` yang relevan tanpa mencentang status verifikasi QA.
5. Klik `Selesai Dev` (`dev_status = 'dev_done'`), lalu segera klik `Open PR` untuk melakukan serah terima ke QA. Selama task berstatus `dev_done` tetapi belum `Open PR`, poin beban kerja tetap dihitung pada Developer Aegis.
6. Pada dialog `Open PR`, isi judul Pull Request, verifikasi nama branch, tulis ringkasan perubahan (changelog) beserta panduan skenario uji QA pada `test_notes`, dan pilih Reviewer/Tester QA (umumnya Tester QA Sentinel atau reviewer Aegis yang ditunjuk). Developer dilarang menunjuk diri sendiri sebagai reviewer QA; validasi database menolak penetapan `tester_id` yang sama dengan pelaku.
7. Aksi `Open PR` mengubah `test_status = 'testing'`, memindahkan kartu ke kolom Review/QA, dan mengalihkan beban kerja aktif ke Tester QA.
8. Jika Tester QA mengirimkan `Request Changes`, sistem mengembalikan `dev_status = 'in_progress'`, `test_status = 'failed'`, dan memindahkan kartu ke `In Progress`. Developer Aegis wajib memperbaiki seluruh poin catatan revisi di `test_notes`, mendorong commit perbaikan ke branch yang sama, lalu klik `Ajukan Ulang PR (Re-open PR)`.

## Kriteria Done 100%, Subtask Checklist, dan Batasan Drag-and-Drop Kanban

Task Tim Aegis hanya dinyatakan selesai 100% (`Done`) jika seluruh syarat berikut terpenuhi bersamaan:

1. Implementasi kode telah tuntas (`dev_status = 'dev_done'`) dan Pull Request telah ditinjau.
2. Reviewer QA yang ditugaskan atau Leader project menyatakan lulus pengujian (`test_status = 'passed'`) melalui aksi `Merge Pull Request`.
3. Seluruh item checklist `task_subtasks` telah selesai (`is_completed = true`) dan diverifikasi oleh Tester QA atau Leader project.

Aturan ini ditegakkan langsung oleh trigger database `before_task_write_guards`. Jika masih ada satu item checklist yang belum selesai atau status QA belum `passed`, sistem memblokir pemindahan kartu ke kolom `Done`. Persentase progress `Project` dan `Milestone` (Dual-Track Progress) hanya mencapai 100% dari task yang tuntas di kedua tahap (Development dan Testing).

Pada papan Kanban, Member Aegis hanya dapat melakukan drag-and-drop pada task yang ditugaskan kepada dirinya sendiri (`assignee_id`, `developer_id`, atau `tester_id`). Member Aegis tidak dapat mengubah `assignee_id`, `developer_id`, `priority`, `base_points`, `origin`, `origin_note`, `due_date`, atau `purpose` karena perubahan metadata tersebut khusus untuk Leader Aegis atau Management.

## Penanganan Bug Teknis dan Komplain Customer Support (CS / cs_complaint)

Tiket yang bersumber dari laporan Customer Support dicatat dengan `origin = 'cs_complaint'` dan wajib memiliki `origin_note` berisi sumber komplain, langkah reproduksi, dan dampak ke pengguna.

1. Ketika tiket `cs_complaint` ditugaskan ke Squad Aegis, `Tech Lead` Aegis memeriksa kelengkapan `origin_note` serta lampiran bukti (screenshot atau log pada `task_attachments`, batas maksimal 5 MB) sebelum menugaskan `Software Engineer` atau `Tech Specialist`.
2. Engineer Aegis mereproduksi bug pada environment dev atau staging, menulis ringkasan akar masalah (root cause) pada komentar detail task, dan membuat branch `fix/...` terhubung ke task tersebut.
3. Pada saat `Open PR`, engineer Aegis wajib menyertakan skenario pengujian regresi di `test_notes` agar Tester QA Sentinel dapat memastikan bug komplain benar-benar teratasi tanpa merusak fitur lain.
4. Apabila hasil investigasi membuktikan kendala berasal dari konfigurasi layanan atau data operasional (bukan cacat kode), engineer Aegis mencatat temuan secara rinci di komentar task dan mengkoordinasikan pengembalian tindak lanjut ke `Tech Lead` Aegis serta Tim Sentinel.

## Eskalasi Task Critical, Hambatan Teknis, dan Critical Watchlist (<72 Jam)

Eskalasi wajib dijalankan oleh anggota Aegis apabila muncul salah satu kondisi berikut: task berprioritas `critical` atau `urgent`, task berprioritas `high` atau `critical` yang masuk `Critical Watchlist` (sisa deadline `<= 72 jam` / `<= 3 hari` atau sudah terlewat/overdue), hambatan `task_dependencies` lintas squad yang memblokir rilis, atau gangguan teknis di produksi.

Jalur eskalasi berjenjang Squad Aegis:

1. Tingkat 1 (`Tech Lead` Aegis): eskalasi awal oleh `Software Engineer` atau `Tech Specialist` untuk unblock kode, sesi pairing, pemecahan task yang terlalu besar, atau percepatan review teknis.
2. Tingkat 2 (`Tech Principal` Aegis): eskalasi untuk keputusan arsitektur mendesak, risiko gagal mencapai target sprint atau kuartal, serta pengalihan task antar engineer Aegis saat PIC utama sedang Overload.
3. Tingkat 3 (`Head of Tech` Tim Management bersama `Tech-Ops Manager` Sentinel): eskalasi lintas squad untuk insiden produksi berdampak luas, persetujuan hotfix darurat, atau penyesuaian jadwal Milestone.

Setiap langkah eskalasi wajib ditulis pada thread komentar detail task agar terekam bersama `activity_log` dan mengirim notifikasi `comment_mention` kepada PIC tujuan.

## Beban Kerja (Workload), Kapasitas Poin Aegis, dan Aturan Overload

Mesin workload Workhub menghitung beban dari 2 poin dasar per task, dikalikan pengali urgensi dan sisa waktu deadline. Nilai 20 poin adalah cadangan kapasitas tim saat belum ada pengaturan kapasitas, terpisah dari bobot per task.

- Pengali prioritas/urgensi: `critical` atau `urgent` 2.0x, `high` 1.5x, `medium` 1.0x, dan `low` 0.5x.
- Pengali sisa deadline: terlewat/overdue (`< 0 jam`) 2.0x, `Critical Watchlist` (`<= 72 jam` atau `<= 3 hari`) 1.5x, normal (4 sampai 7 hari) 1.0x, jangka panjang (`> 7 hari`) 0.7x, dan tanpa deadline 1.0x.
- Task yang telah selesai (`dev_done` dan `passed`, atau berada di kolom `Done`) bernilai 0 poin sehingga langsung membebaskan kapasitas engineer.

Standar `capacity_points` individu di Squad Aegis (dapat disesuaikan Leader pada rentang 10 sampai 1000 poin di `/team`):

- `Software Engineer`: default 100 poin.
- `Tech Specialist`: 150 poin.
- `Tech Lead` dan `Tech Principal`: 250 poin.

Status kapasitas pada `/workload` dan evaluasi asisten AI:

- `Available` (`< 50%` kapasitas terpakai dan task aktif `<= 2`): kandidat utama untuk menerima penugasan fitur atau bug baru.
- `Optimal` (`50%` sampai `80%`, dengan penanda visual `Mendekati Batas` pada `70%` sampai `80%`): kapasitas sehat untuk beban kerja reguler.
- `Overload` (`> 80%` kapasitas): `Tech Lead` dan `Tech Principal` dilarang menambahkan task prioritas `high` atau `critical` baru kepada engineer berstatus Overload. Prioritaskan penyelesaian PR yang masih tertunda agar beban berpindah ke QA, atau redistribusikan task ke engineer Aegis berstatus `Available`.

## Aturan Undangan Tim, Masa Berlaku Kedaluwarsa (Expired), dan Isolasi Akses Aegis

1. Hanya Leader Aegis (`Tech Lead` atau `Tech Principal`) dan Leader Management yang berwenang mengirim undangan email anggota baru ke Tim Aegis, membatalkan undangan pending, serta mengubah role (`leader`/`member`) dan `capacity_points` anggota Aegis di halaman `/team`.
2. Setiap undangan di `team_invitations` memiliki masa berlaku 7 hari sejak dibuat (`expires_at`).
3. Klaim undangan dijalankan secara atomik oleh RPC `claim_team_invitation` hanya setelah calon anggota menyelesaikan verifikasi email (`email_confirmed_at` terisi, termasuk otomatis saat login OAuth yang sudah terverifikasi). Akun yang belum memverifikasi email tidak dapat mengklaim undangan maupun memperoleh `team_id` dan role Aegis.
4. Undangan pending yang melewati 7 hari otomatis berstatus `expired` sehingga Leader Aegis dapat mengirim undangan baru ke email yang sama tanpa terblokir.
5. Isolasi akses halaman: anggota dan Leader Aegis (non-Management) hanya dapat melihat cakupan data Tim Aegis sendiri di `/` (Dashboard), `/team`, dan `/workload`.

## Guardrail Asisten AI, Override Saran Prioritas, dan Larangan Akses Database Langsung

1. Asisten AI Workhub hanya berfungsi sebagai penasihat teknis dan tidak boleh membuat task, mengubah status Kanban, atau mengganti assignee secara otomatis.
2. Saat Leader Aegis menggunakan prediksi prioritas dan estimasi durasi AI pada dialog pembuatan task, nilai saran AI tetap dapat diubah secara bebas sebelum disimpan. Setiap perubahan (override) dicatat otomatis ke tabel `ai_suggestion_overrides` sebagai bahan evaluasi akurasi model.
3. Zero raw DB access: asisten AI tidak memiliki akses langsung ke tabel mentah database maupun koneksi database langsung. Data beban kerja selalu melewati agregator ter-sanitasi di server, sedangkan jawaban SOP hanya mengutip bagian relevan dari panduan terbit Tim Aegis di `ai_knowledge_documents` (pada fase pilot, pertanyaan SOP melalui chat dibatasi untuk role `leader`).
4. Pertanyaan yang tidak tercakup pada panduan terbit Aegis atau berada di luar domain manajemen proyek dan rekayasa perangkat lunak Workhub wajib ditolak tanpa mengarang prosedur baru.
