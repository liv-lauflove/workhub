# Panduan Tata Kelola Tim Management (Head of Tech)

Dokumen ini menjadi pedoman tata kelola lintas tim bagi `Head of Tech` dan pimpinan di Tim `Management` pada Workhub. Tim `Management` merupakan tim sistem bawaan (`MANAGEMENT_TEAM_ID`) yang dilindungi agar namanya tidak dapat diubah atau dihapus. Melalui Executive Squad Switcher pada `/`, `/workload`, dan `/team`, Tim Management memantau agregat `Semua Tim` maupun beralih ke squad spesifik seperti `Aegis`, `Sentinel`, dan tim dinamis baru lainnya.

## Tata Kelola Panduan AI Tim: Draf, Pratinjau, Publikasi, dan Penarikan

Halaman `/settings/knowledge-base` (menu Pengaturan -> Panduan AI Tim) hanya dapat diakses oleh pengguna dengan `role = 'leader'` pada Tim `Management` (divalidasi oleh fungsi `can_manage_ai_knowledge()`). Member Management dan Leader squad non-Management tidak memiliki izin mengelola siklus hidup dokumen panduan AI.

Alur resmi pengelolaan SOP Markdown per tim:

1. Pilih tim target di `/settings/knowledge-base`. Untuk squad baru, unduh kerangka awal dari `/templates/panduan-tim.md`.
2. Pastikan berkas Markdown berekstensi `.md`, ber-encoding UTF-8, berukuran maksimal 64 KB (`65536` byte), bebas null byte, memiliki judul H1 maksimal 160 karakter, memiliki bagian berisi teks di bawah heading yang jelas, dan menutup setiap blok kode dengan seimbang.
3. Unggah berkas sebagai draf melalui RPC `create_ai_knowledge_draft`. Setiap tim hanya menyimpan maksimal satu draf aktif; unggahan baru otomatis mengarsipkan draf lama dan menaikkan nomor `version` secara berurutan.
4. Uji draf menggunakan form pratinjau dengan pertanyaan SOP nyata tim tersebut (kriteria Done, serah terima PR, komplain CS, eskalasi critical, beban kerja, dan undangan) serta minimal satu pertanyaan di luar ruang lingkup untuk memastikan sistem menjawab `Belum ada pedoman tim yang menjawab pertanyaan ini.`.
5. Setelah isi dan hasil uji sesuai prosedur tim, klik `Terbitkan panduan` (`set_ai_knowledge_document_state` aksi `publish`). Panduan terbit sebelumnya otomatis diarsipkan (`archived`), sehingga setiap tim hanya memiliki satu panduan `published` yang aktif.
6. Apabila panduan terbit mengandung kekeliruan kebijakan atau sudah tidak berlaku, segera klik `Tarik dari chat` (aksi `withdraw`) untuk mengubah statusnya menjadi `archived`. Penarikan atau publikasi versi baru otomatis mencabut visibilitas baca entri cache SOP lama (`cache_scope LIKE 'knowledge:%'`) di `ai_query_cache`.

Saat Leader Management menanyakan pertanyaan SOP melalui panel chat AI, pilih satu tim spesifik terlebih dahulu dan jangan berada di cakupan `Semua Tim` (`all`). Sistem menolak pencarian SOP pada scope `all` agar prosedur antar squad tidak tercampur.

## Pengelolaan Tim Dinamis, Kapasitas Poin, dan Evaluasi Overload Lintas Squad

Tim Management adalah satu-satunya otoritas yang dapat membuat squad baru atau mengubah nama squad eksisting di `/team` (nama minimal 2 karakter, unik, dan dilarang memakai nama `Management`).

Leader Management dapat mengatur `role` (`leader` atau `member`) dan `capacity_points` individu di semua tim melalui RPC `update_team_member` dengan rentang nilai `10` hingga `1000` poin. Sistem mengunci transaksi tim untuk mencegah penurunan role leader terakhir pada satu tim.

Acuan standar `capacity_points` organisasi Workhub:

- `Standar Member` (`Software Engineer` Aegis, `Tech Ops` Sentinel): 100 poin.
- `Specialist` (`Tech Specialist` Aegis): 150 poin.
- `Principal / Lead` (`Tech Principal`, `Tech Lead`, `Tech-Ops Principal`): 250 poin.
- `Manager / Head` (`Tech-Ops Manager`, `Head of Tech`): 300 poin.

Kalkulasi beban kerja pada `/workload` mengacu pada `base_points` task default 20 poin serta mesin dinamis yang mengalikan bobot dasar dengan pengali urgensi (`critical`/`urgent` 2.0x, `high` 1.5x, `medium` 1.0x, `low` 0.5x) dan pengali sisa deadline (terlewat/overdue 2.0x, `Critical Watchlist <= 72 jam` 1.5x, normal 4 sampai 7 hari 1.0x, jangka panjang `> 7 hari` 0.7x, tanpa deadline 1.0x). Ambang status kapasitas:

- `Available` (`< 50%` kapasitas terpakai dan task aktif `<= 2`).
- `Optimal` (`50%` sampai `80%`, peringatan `Mendekati Batas` mulai `70%` sampai `80%`).
- `Overload` (`> 80%` kapasitas): bila overload terjadi secara merata di satu squad, `Head of Tech` berkoordinasi dengan Leader squad untuk memangkas scope non-kritis, menggeser prioritas, atau menyesuaikan target Milestone.

## Standar Kriteria Done 100%, Serah Terima Dev ke QA (Open PR), dan Pelaporan Milestone

Seluruh squad wajib mematuhi hierarki `Milestone` -> `Project` -> `Task` dan prinsip Dual-Assignee (Developer dan Tester QA):

1. Milestone bersifat strategis dan dapat membawahi beberapa Project dari squad yang berbeda, dengan PIC yang wajib ditetapkan sebelum status Milestone berpindah ke `in_progress`.
2. Serah terima pengerjaan ke QA wajib melewati `dev_status = 'dev_done'` dan aksi `Open PR` dengan catatan pengujian (`test_notes`) dan penunjukan reviewer resmi.
3. Suatu task hanya dihitung selesai 100% (`Done`) bila development selesai (`dev_done`), review pengujian QA lulus (`test_status = 'passed'` via `Merge Pull Request`), dan 100% item checklist `task_subtasks` telah diverifikasi selesai.
4. Pada papan Kanban, Member lintas squad hanya diizinkan melakukan drag-and-drop pada task yang ditugaskan kepada dirinya sendiri (`assignee_id`, `developer_id`, atau `tester_id`), sedangkan pengaturan kolom Kanban dan metadata prioritas tetap dikelola Leader.
5. Leader Management tidak boleh meminta bypass atas trigger `before_task_write_guards` demi menaikkan persentase progress laporan kuartalan. Materi Town Hall yang diekspor ke PDF atau Excel dari dashboard `/` wajib mencerminkan capaian Dual-Track yang terverifikasi, dan Milestone atau Project yang telah selesai diarsipkan melalui mekanisme arsip tanpa penghapusan permanen.

## Tata Kelola Komplain Customer Support (CS / cs_complaint) dan Eskalasi Lintas Tim

Seluruh keluhan Customer Support yang masuk ke tim teknis wajib dicatat dengan `origin = 'cs_complaint'` beserta `origin_note` dan lampiran bukti bila tersedia (maksimal 5 MB per berkas di `task_attachments`) agar proporsi beban perbaikan komplain terhadap pengembangan fitur dapat diaudit pada evaluasi kuartalan.

`Head of Tech` menangani eskalasi Tingkat 3 yang diteruskan oleh `Tech Principal` / `Tech Lead` Aegis atau `Tech-Ops Manager` / `Tech-Ops Principal` Sentinel pada kondisi berikut:

1. Insiden produksi berprioritas `critical` atau `urgent` yang mengganggu layanan inti atau berdampak luas pada pengguna.
2. Task pada `Critical Watchlist` (prioritas `high` atau `critical` dengan sisa waktu `<= 72 jam` / `<= 3 hari` atau overdue) yang membutuhkan realokasi sumber daya lintas squad.
3. Konflik prioritas antara penanganan lonjakan komplain `cs_complaint` dan jadwal deliverable `Milestone` kuartalan.
4. Hambatan `task_dependencies` lintas squad Aegis dan Sentinel yang belum terurai pada tingkat Leader squad.

Setiap keputusan eskalasi `Head of Tech` (reprioritisasi, realokasi kapasitas, atau penyesuaian target tanggal Milestone) didokumentasikan pada komentar task atau catatan Milestone agar terekam di `activity_log`.

## Aturan Undangan Anggota Tim, Masa Berlaku Kedaluwarsa (Expired), dan Kontrol Akses

1. Leader Management berwenang mengirim dan membatalkan undangan anggota untuk seluruh tim di `/team`, sedangkan Leader squad non-Management hanya dapat mengelola undangan untuk timnya sendiri.
2. Setiap undangan email di `team_invitations` berlaku selama 7 hari (`expires_at`).
3. Klaim undangan berjalan atomik melalui RPC `claim_team_invitation` hanya setelah email pengguna terverifikasi (`email_confirmed_at` terisi). Kebijakan ini mencegah akun dengan email belum terkonfirmasi memperoleh keanggotaan tim atau role.
4. Undangan pending yang melewati 7 hari otomatis berstatus `expired` sehingga undangan baru ke email yang sama tidak terblokir.
5. Pengguna non-Management dibatasi ketat pada cakupan timnya sendiri di `/`, `/team`, dan `/workload`. Hak tinjau lintas tim hanya dimiliki Tim Management berdasarkan identitas sistem `MANAGEMENT_TEAM_ID`.

## Guardrail Asisten AI, Audit Override Saran Prioritas, dan Larangan Akses Database Langsung

1. Kedaulatan keputusan manusia (Human Sovereignty): asisten AI hanya memberi rekomendasi analisis, prediksi prioritas, dan rujukan SOP. AI tidak boleh menjalankan mutasi database, mengubah status task, atau menugaskan anggota secara mandiri.
2. Audit `ai_suggestion_overrides`: setiap kali Leader mengubah prioritas atau estimasi durasi yang disarankan AI saat membuat task, Workhub mencatat nilai saran AI dan keputusan akhir di `ai_suggestion_overrides`. `Head of Tech` meninjau tren override tersebut untuk mengevaluasi akurasi prediksi AI dan menyelaraskan standar prioritas antar squad.
3. Zero raw DB access dan isolasi cache: asisten AI tidak memiliki akses langsung ke tabel mentah database maupun koneksi langsung PostgreSQL. Konteks beban kerja selalu melewati agregasi ter-sanitasi di server, entri `ai_query_cache` terisolasi per `user_id`, `team_id`, `provider`, `model`, dan `prompt_version` dengan TTL terbatas, serta akses baca dan tanya-jawab panduan SOP pada fase pilot dibatasi untuk role `leader`.
