> Draf untuk ditinjau. Konfirmasi prosedur khusus dengan Lead Sentinel sebelum Leader Management menerbitkan panduan.

# Panduan Kerja Tim Sentinel (Squad Tech Ops & QA)

Panduan ini merangkum alur kerja Tim Sentinel (Squad Tech Ops & QA) di Workhub. Struktur peran Sentinel terdiri atas `Tech-Ops Manager` dan `Tech-Ops Principal` sebagai Leader Sentinel, serta `Tech Ops` sebagai Member Sentinel yang bertindak sebagai Tester QA dan operator triase operasional. Sesuai prinsip Dual-Assignee Workhub, Tim Sentinel menjaga gerbang verifikasi kualitas (`tester_id`, `test_status`, dan checklist `task_subtasks`) serta memimpin penerimaan dan triase komplain Customer Support.

## Alur Pengujian QA, Review Pull Request (PR), dan Pengembalian ke Developer

Task masuk ke ruang lingkup pengujian Tim Sentinel segera setelah Developer menyelesaikan coding (`dev_status = 'dev_done'`) dan klik `Open PR` (`test_status = 'testing'`). Pada titik ini, kartu berpindah ke kolom Review/QA dan poin beban kerja aktif berpindah ke Tester QA Sentinel yang ditunjuk.

Langkah pengujian oleh Tester `Tech Ops` Sentinel:

1. Tinjau deskripsi perubahan dan panduan skenario pengujian yang ditulis Developer pada `test_notes`, serta periksa branch (`github_branch`) dan repositori (`github_repo`) terkait.
2. Jalankan pengujian fungsional, skenario negatif (edge case), dan uji regresi pada environment staging atau preview sesuai tujuan task.
3. Centang satu per satu item checklist `task_subtasks` yang telah teruji; bila perlu, unggah bukti pengujian (screenshot atau log, maksimal 5 MB) ke `task_attachments`.

Keputusan akhir review QA di kotak Pull Request detail task:

- Lulus pengujian (`Merge Pull Request`): dipilih hanya bila seluruh skenario uji lolos dan seluruh item `task_subtasks` sudah terverifikasi (`is_completed = true`). Aksi ini menetapkan `test_status = 'passed'`, mempertahankan `dev_status = 'dev_done'`, memindahkan task ke kolom `Done`, dan langsung membebaskan poin beban kerja (0 poin).
- Gagal pengujian (`Request Changes`): dipilih bila ditemukan bug, ketidaksesuaian kriteria penerimaan, atau regresi. Tester Sentinel wajib menulis catatan revisi yang jelas pada `test_notes` (langkah reproduksi, hasil aktual, dan hasil yang diharapkan). Aksi `Request Changes` mengubah `test_status = 'failed'`, mengembalikan `dev_status = 'in_progress'`, memindahkan kartu ke kolom `In Progress`, dan mengembalikan beban kerja aktif ke Developer.

Sesuai trigger `before_task_write_guards`, Tester QA Sentinel hanya berwenang memperbarui status pengujian (`test_status`), catatan uji (`test_notes`), dan verifikasi checklist; Tester tidak boleh mengubah `title`, `description`, `github_branch`, `github_repo`, `priority`, `due_date`, atau `developer_id`.

## Kriteria Done 100%, Verifikasi Subtask Checklist, dan Batasan Drag-and-Drop

Sebuah task hanya sah mencapai 100% selesai (`Done`) apabila tiga syarat berikut terpenuhi seluruhnya:

1. Tahap development selesai (`dev_status = 'dev_done'`).
2. Pengujian QA dinyatakan lulus (`test_status = 'passed'`) oleh Tester QA yang ditugaskan atau Leader project.
3. Seluruh item checklist `task_subtasks` berstatus `is_completed = true`.

Aturan pengelolaan checklist pengujian (`task_subtasks`):

- Hanya Tester QA yang ditugaskan (`tester_id`) atau Leader project yang berwenang mencentang verifikasi checklist (`is_completed`, `tested_by`, `tested_at`), dengan `tested_by` wajib sesuai sesi pengguna aktif.
- Tester QA atau Developer yang ditugaskan dapat menambah item checklist baru (`is_completed = false`) sebelum pengujian selesai, tetapi penghapusan item yang sudah terverifikasi hanya diizinkan bagi Tester QA yang ditugaskan atau Leader project.
- Database menolak perubahan `test_status = 'passed'` maupun pemindahan kartu ke kolom `Done` jika masih terdapat satu pun item checklist yang belum selesai.

Pada papan Kanban, Member Sentinel hanya boleh melakukan drag-and-drop pada task yang ditugaskan kepada dirinya sendiri (`tester_id`, `assignee_id`, atau `developer_id`).

## Penerimaan dan Triase Komplain Customer Support (CS / cs_complaint)

Workhub belum terintegrasi langsung dengan kanal eksternal CS seperti WhatsApp, email, atau Zendesk, sehingga seluruh laporan komplain Customer Support dicatat ke Workhub melalui proses penerimaan dan triase Tim Sentinel:

1. Leader Sentinel (`Tech-Ops Manager` atau `Tech-Ops Principal`) atau anggota Sentinel membuat task pada project yang relevan dengan menetapkan `origin = 'cs_complaint'`.
2. Isi field wajib `origin_note` secara terstruktur: kanal dan nomor tiket CS, waktu kejadian, kronologi kendala, serta dampaknya terhadap pengguna (tanpa mencantumkan kata sandi atau kredensial pelanggan).
3. Lampirkan bukti pendukung (screenshot error, potongan log, atau berkas pelaporan) pada `task_attachments` dengan batas ukuran maksimal 5 MB per berkas.
4. Lakukan triase awal untuk memisahkan kendala operasional/konfigurasi dari cacat kode aplikasi:
   - Kendala operasional atau konfigurasi layanan ditangani langsung oleh `Tech Ops` Sentinel dan tetap melalui verifikasi silang rekan QA Sentinel sebelum masuk `Done`.
   - Cacat kode aplikasi ditetapkan prioritasnya (`critical` untuk layanan lumpuh/keamanan/data, `high` untuk fitur inti terganggu, `medium` untuk bug non-pemblokir), lalu dikoordinasikan ke `Tech Lead` Aegis untuk penunjukan `developer_id` sementara `tester_id` tetap dipegang Sentinel guna memverifikasi perbaikan sebelum komplain ditutup.

## Eskalasi Insiden Critical, Komplain Mendesak, dan Critical Watchlist (<72 Jam)

Pemicu eskalasi di Squad Sentinel meliputi: task berprioritas `critical` atau `urgent`, task berprioritas `high` atau `critical` yang masuk `Critical Watchlist` (sisa waktu deadline `<= 72 jam` / `<= 3 hari` atau sudah overdue), komplain CS yang memengaruhi banyak pengguna, atau antrean pengujian PR yang menumpuk hingga mengancam tanggal rilis.

Jalur eskalasi berjenjang Squad Sentinel:

1. Tingkat 1 (`Tech-Ops Principal` Sentinel): eskalasi oleh `Tech Ops` jika environment pengujian bermasalah, data uji tidak tersedia, atau satu PR gagal pengujian (`Request Changes`) lebih dari dua siklus berturut-turut.
2. Tingkat 2 (`Tech-Ops Manager` Sentinel): eskalasi untuk insiden `Critical Watchlist` (`<= 72 jam`), lonjakan tiket `cs_complaint` berprioritas `high` atau `critical`, serta pengaturan ulang urutan antrean QA squad.
3. Tingkat 3 (`Head of Tech` Tim Management bersama `Tech Principal` Aegis): eskalasi lintas squad bila insiden produksi membutuhkan hotfix segera, pengalihan kapasitas engineer Aegis, atau revisi jadwal Milestone.

Catat kronologi dan keputusan eskalasi pada komentar detail task agar terekam di `activity_log` dan memicu notifikasi `comment_mention`.

## Beban Kerja (Workload), Kapasitas Poin Ops/QA Sentinel, dan Aturan Overload

Beban kerja aktif pada Tester QA Sentinel tercatat sejak PR dibuka (`dev_status = 'dev_done'` dan `test_status = 'testing'`) sampai pengujian tuntas. Mesin workload menghitung beban dari 2 poin dasar per task, dikalikan pengali urgensi dan sisa waktu deadline. Nilai 20 poin adalah cadangan kapasitas tim saat belum ada pengaturan kapasitas, terpisah dari bobot per task.

- Pengali prioritas/urgensi: `critical` atau `urgent` 2.0x, `high` 1.5x, `medium` 1.0x, dan `low` 0.5x.
- Pengali sisa deadline: terlewat/overdue (`< 0 jam`) 2.0x, `Critical Watchlist` (`<= 72 jam` atau `<= 3 hari`) 1.5x, normal (4 sampai 7 hari) 1.0x, jangka panjang (`> 7 hari`) 0.7x, dan tanpa deadline 1.0x.
- Setelah QA klik `Merge Pull Request` (`Done`), beban task menjadi 0 poin. Jika QA klik `Request Changes`, beban langsung kembali ke Developer.

Standar `capacity_points` individu di Squad Sentinel (diatur Leader pada rentang 10 sampai 1000 poin di `/team`):

- `Tech Ops`: default 100 poin.
- `Tech-Ops Principal`: 250 poin.
- `Tech-Ops Manager`: 300 poin.

Status kapasitas pada `/workload`:

- `Available` (`< 50%` kapasitas terpakai dan task aktif `<= 2`): kandidat utama penerima antrean review PR baru atau triase `cs_complaint`.
- `Optimal` (`50%` sampai `80%`, peringatan `Mendekati Batas` mulai `70%` sampai `80%`): beban pengujian seimbang.
- `Overload` (`> 80%` kapasitas): `Tech-Ops Manager` dan `Tech-Ops Principal` dilarang menugaskan review PR baru atau tiket komplain prioritas tinggi kepada anggota `Tech Ops` yang Overload tanpa memindahkan antrean ke anggota berstatus `Available`.

## Aturan Undangan Tim, Masa Berlaku Kedaluwarsa (Expired), dan Isolasi Akses Sentinel

1. Hanya Leader Sentinel (`Tech-Ops Manager` atau `Tech-Ops Principal`) dan Leader Management yang berhak mengirim atau membatalkan undangan anggota baru Tim Sentinel serta mengubah role (`leader`/`member`) dan `capacity_points` anggota Sentinel melalui halaman `/team`.
2. Undangan tim berbasis email berlaku selama 7 hari (`expires_at`).
3. Klaim undangan dieksekusi secara atomik melalui RPC `claim_team_invitation` hanya setelah email pengguna terverifikasi (`email_confirmed_at` tidak kosong). Akun tanpa verifikasi email tidak dapat mengklaim undangan maupun masuk ke Tim Sentinel.
4. Undangan pending yang melewati 7 hari otomatis berstatus `expired`, sehingga Leader Sentinel dapat mengirim undangan baru ke alamat email yang sama.
5. Isolasi akses: pengguna Sentinel (non-Management) hanya dapat mengakses data Tim Sentinel sendiri di halaman `/`, `/team`, dan `/workload`.

## Guardrail Asisten AI, Override Saran Prioritas, dan Keamanan Data Operasional

1. Asisten AI Workhub bersifat penasihat; keputusan kelulusan QA, `Request Changes`, penetapan prioritas `cs_complaint`, dan penugasan reviewer sepenuhnya tetap berada di tangan personel Sentinel.
2. Saat Leader Sentinel mengubah prioritas atau estimasi durasi yang disarankan AI pada pembuatan tiket, sistem menyimpan catatan perbandingannya di `ai_suggestion_overrides` untuk evaluasi akurasi.
3. Zero raw DB access: asisten AI dilarang dan tidak mampu membaca tabel mentah database maupun berkas lampiran internal secara langsung. Konteks beban kerja selalu disanitasi di server, sedangkan jawaban SOP merujuk langsung ke panduan terbit Tim Sentinel di `ai_knowledge_documents` (pada fase pilot, tanya-jawab panduan SOP dibuka khusus untuk role `leader`).
4. Dilarang menuliskan kredensial, token akses, atau data pribadi sensitif pelanggan dari tiket komplain CS ke dalam prompt AI maupun dokumen panduan Markdown.
