# Aturan Otorisasi Actor & Transisi Workflow Developer - QA (B01)

Dokumen ini mendokumentasikan remediasi keamanan untuk **Audit Ref: B01** ([Issue #151](https://github.com/liv-lauflove/workhub/issues/151)): validasi otorisasi actor, pemisahan tugas (_separation of duties_), aturan anti-self-approval, dan atomisitas transisi status workflow Developer–QA pada server actions.

---

## 1. Latar Belakang & Analisis Risiko

Sebelum remediasi, server actions pada workflow QA (`mergePullRequestAction`, `updateTaskTestStatusAction`, `updateTaskDevStatusAction`, `openPullRequestAction`, `requestChangesAction`) hanya memeriksa sesi login (`auth.getUser()`) tanpa memvalidasi:

1. **Otorisasi Actor**: Siapa yang berhak mengubah status development vs status pengujian QA.
2. **Pemisahan Peran & Anti-Self-Approval**: Developer dapat menugaskan diri sendiri sebagai reviewer atau melakukan self-approval/merge pada PR miliknya sendiri.
3. **Prasyarat Status Workflow**: Task dapat di-merge atau disetujui (_passed_) meskipun development masih berjalan (`in_progress` atau `todo`) atau belum diajukan ke tahap pengujian (`testing`).
4. **Prasyarat Checklist Subtask**: Task dapat disetujui tanpa menyelesaikan item checklist pengujian pada `task_subtasks`.
5. **Perlindungan Terhadap Stale/Race Condition**: Mutasi tanpa filter kondisi atomik berisiko menimpa status yang telah berubah secara konkuren.

---

## 2. Matriks Otorisasi Actor

| Server Action                  | Aktor yang Berwenang                                  | Larangan / Pembatasan                                                                                                                                        | Transisi Status                                                                                                                          |
| :----------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `updateTaskRoleAssigneeAction` | Project Leader, Management Leader                     | Developer tidak boleh sama dengan Tester pada task yang sama (_separation of duties_).                                                                       | Memperbarui `developer_id` atau `tester_id`.                                                                                             |
| `updateTaskDevStatusAction`    | Developer yang ditugaskan, Project Leader, Management | Non-developer / QA tanpa hak leader dilarang mengubah status development.                                                                                    | Jika `dev_done`, otomatis mengatur `test_status: 'testing'`. Jika mundur dari `dev_done`, `test_status: 'passed'` dianulir ke `pending`. |
| `openPullRequestAction`        | Developer yang ditugaskan, Project Leader, Management | Developer dilarang menunjuk diri sendiri sebagai reviewer (`reviewerId !== developer_id`). Task yang sudah `passed` tidak dapat diajukan ulang tanpa revisi. | `dev_status: 'dev_done'`, `test_status: 'testing'`, pindah ke kolom Review jika ada.                                                     |
| `updateTaskTestStatusAction`   | Tester yang ditugaskan, Project Leader, Management    | **Anti-Self-Approval**: Developer dilarang menetapkan `testStatus: 'passed'` pada task miliknya sendiri. Wajib seluruh subtask `is_completed = true`.        | Hanya boleh `passed` jika saat ini `dev_done` & `testing`.                                                                               |
| `requestChangesAction`         | Tester yang ditugaskan, Project Leader, Management    | Developer dilarang melakukan request changes pada task miliknya sendiri. Hanya untuk task dalam tahap review.                                                | `dev_status: 'in_progress'`, `test_status: 'failed'`, pindah ke kolom In Progress jika ada.                                              |
| `mergePullRequestAction`       | Tester yang ditugaskan, Project Leader, Management    | **Anti-Self-Approval**: Developer dilarang melakukan merge PR miliknya sendiri. Wajib seluruh subtask `is_completed = true`.                                 | `dev_status: 'dev_done'`, `test_status: 'passed'`, pindah ke kolom Done.                                                                 |

---

## 3. Aturan Integritas & Transisi Atomik

### 3.1. Prasyarat Checklist Subtask

Sebelum pengujian dinyatakan lulus (`passed`) melalui `updateTaskTestStatusAction` atau `mergePullRequestAction`, sistem secara otomatis memeriksa tabel `task_subtasks`:

```sql
select id from task_subtasks where task_id = :taskId and is_completed = false;
```

Jika ditemukan satu atau lebih subtask yang belum selesai (`is_completed !== true`), aksi ditolak seketika dengan pesan:

> _"Seluruh checklist subtask pengujian wajib diselesaikan sebelum task dinyatakan Passed QA atau di-merge."_

### 3.2. Penjagaan Kondisional Atomik di Database

Untuk mencegah _race condition_ atau _stale updates_ dari dua client yang memproses task bersamaan, pembaruan ke status `passed` atau penyelesaian PR mengeksekusi conditional update pada level query:

```typescript
await supabase
  .from('tasks')
  .update(updates)
  .eq('id', taskId)
  .eq('dev_status', 'dev_done')
  .eq('test_status', 'testing')
  .select('id, dev_status, test_status, column_id')
  .single();
```

Jika kondisi state telah berubah sebelum query dieksekusi, pembaruan dibatalkan tanpa mutasi data dan menghasilkan error deskriptif.

---

## 4. Pengujian Regresi Otomatis

Suite pengujian regresi menyeluruh diimplementasikan pada `scripts/test-workflow-actor-validation.mjs` dan didaftarkan pada `package.json`:

```bash
pnpm run test:workflow-actors
```

Cakupan pengujian (24 assertion checks):

1. Verifikasi larangan self-assignment reviewer dan penetapan peran ganda developer-tester pada `updateTaskRoleAssigneeAction`.
2. Verifikasi otorisasi actor dan transisi otomatis `testing` pada `updateTaskDevStatusAction`.
3. Verifikasi anti-self-approval reviewer dan validitas task pada `openPullRequestAction`.
4. Verifikasi larangan developer menandai `passed`, prasyarat `dev_done` & `testing`, dan prasyarat checklist pada `updateTaskTestStatusAction`.
5. Verifikasi penolakan developer merevisi task sendiri dan transisi status pada `requestChangesAction`.
6. Verifikasi anti-self-approval, prasyarat checklist, penolakan update stale secara atomik, dan penyelesaian alur oleh reviewer/leader pada `mergePullRequestAction`.
