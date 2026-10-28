# Notulensi Meeting: Project Workhub (Task Management)

**Topik Pembahasan:** Integrasi AI, Manajemen Beban Kerja (Workload), Alur Testing, dan Dashboarding
**Fokus Project:** Aplikasi Task Management

## 1. Integrasi AI Agent & Floating Chat (Next.js)

- **UI/UX:** Tambahkan fitur _floating chat_ di dalam aplikasi untuk berinteraksi dengan AI.
- **Teknologi & Arsitektur:**
  - Gunakan pendekatan **RAG (Retrieval-Augmented Generation)** / Knowledge Base.
  - **PENTING:** AI tidak diperbolehkan membaca atau melakukan query langsung ke _raw database_ untuk alasan keamanan dan efisiensi.
  - AI hanya membaca struktur dokumen atau _knowledge base_ yang sudah disiapkan untuk memberikan konteks (misalnya: merangkum pekerjaan atau _summary task_ selama kurun waktu tertentu).
  - Jika _load_ data ringan, AI bisa diprogram agar dapat merespons otomatis, menge-tag _assignee_ yang _load_-nya sedikit, atau merekomendasikan prioritas pekerjaan.

## 2. Fitur Manajemen Beban Kerja (Workload & Capacity)

- **Problem:** Aplikasi seperti Jira/Trello terkadang kurang informatif dalam memperlihatkan secara cepat siapa anggota tim yang sedang _overload_.
- **Solusi & Perhitungan Kapasitas:**
  - Perlu dirumuskan **formula perhitungan beban (load) tim**.
  - Indikator utama penentu _overload_: **Urgency (Tingkat Kepentingan: High/Medium/Low)** dan **Due Date (Batas Waktu)**.
  - _Contoh Kasus:_ Jika seorang _developer_ hanya memegang sedikit tiket, namun status tiketnya _High Urgency_ dan _Due Date_ tersisa sangat singkat (misal 3 hari), maka ia berstatus _overload_ dan tidak boleh di-assign task baru.
  - _Sistem Poin (Usulan):_ Menerapkan sistem poin bobot (misal: base 20 poin per task) yang akan bertambah/berkurang berdasarkan kombinasi Urgency dan Due Date.

## 3. Alur Kerja (Workflow), Testing, & Subtask

- **Pembagian Assignee:** Perlu ada pemisahan _assignee_ yang jelas dalam satu task: pihak yang mengerjakan (Developer) dan pihak yang melakukan pengujian (Tester, biasanya tim Ops atau Product).
- **Transisi Status (Development ke Testing):**
  - Saat status task diubah menjadi "Testing", task tersebut akan otomatis masuk ke daftar kerja/tag Tester (Ops/Product).
  - Sebuah task juga dimungkinkan untuk dibuat khusus hanya untuk kebutuhan testing (tanpa tahap development).
- **Fungsi Subtask sebagai Checklist Testing:**
  - Saat membuat task, detail _subtask_ (seperti setup, pemodelan, dll) harus dicantumkan.
  - Subtask ini berfungsi sebagai acuan atau _checklist_ bagi Tester saat melakukan pengujian. Hasil testing dapat didokumentasikan langsung di dalam task tersebut.
- **Definisi Selesai (Progress 100%):** Dalam kerangka _milestone_ project, sebuah task baru bisa dianggap benar-benar **100% selesai** apabila **kedua tahapan (Development & Testing) sudah rampung**. Jika baru tahap development yang selesai, persentase belum mencapai 100%.

## 4. Dashboard & Tampilan Data (UI/UX)

- Hindari menampilkan data mentah yang terlihat seperti tabel _spreadsheet_ kaku.
- Buat _dashboard_ yang menyajikan **kesimpulan (summary)** dari persebaran tiket dan kapasitas tim.
- Tujuannya agar tim bisa memantau pekerjaan satu sama lain, melihat rangkuman hasil _testing_, serta dengan cepat mengidentifikasi siapa member yang _overload_ dan siapa yang _available_ (seperti metafora "spidometer" beban kerja).

## 5. History & Relasi Task

- Sistem harus bisa melakukan pelacakan histori (_archives_).
- Jika sebuah task baru merupakan hasil dari diskusi atau turunan task sebelumnya, harus ada relasi/rantai yang menyambungkan konteksnya (misal: "task ini adalah lanjutan dari diskusi A").

## 6. Target & Action Items Selanjutnya

- [ ] **Riset Formula Overload:** Buat dan sepakati cara menghitung kapasitas tim berdasarkan kombinasi _Urgency_ dan _Due Date_ (Sistem 20 Poin).
- [ ] **Desain Arsitektur AI (RAG):** Siapkan mekanisme ekstraksi _knowledge base_ agar AI bisa membaca ringkasan task tanpa mengakses _core database_.
- [ ] **Implementasi Alur Testing:** Terapkan sistem _dual-assignee_ (Dev & Tester) dan sistem _subtask_ sebagai _checklist_ pengujian.
- [ ] **Fitur Export:** Eksekusi fitur export data (backend sudah siap, tinggal integrasi frontend).
- [ ] **Desain UI/UX Dashboard:** Rancang dashboard interaktif untuk merangkum beban tim dan progres _milestone_ project.
- [ ] **Target Rilis:** Sistem ini ditargetkan siap untuk didemokan (_showcase_) pada Q3.
