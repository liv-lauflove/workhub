/**
 * Workflow Rules & Engineering SOP Knowledge Base for Workhub AI RAG (Issue #97).
 * Contains documented organizational rules, dual-assignee testing workflows,
 * Definition of Done criteria, and workload calculation policies based on hasil-meet.md.
 */

export interface WorkflowSection {
  id: string;
  title: string;
  summary: string;
  rules: string[];
}

export const WORKHUB_WORKFLOW_RULES: WorkflowSection[] = [
  {
    id: 'kanban-lifecycle',
    title: 'Siklus Hidup Task & Kolom Kanban',
    summary:
      'Alur perpindahan tiket dari inisiasi hingga selesai di papan Kanban Workhub.',
    rules: [
      '**Backlog:** Kolom awal untuk task baru, ide fitur, atau tiket CS complaint yang belum dijadwalkan.',
      '**In Progress:** Task yang sedang aktif dikerjakan oleh Developer yang ditunjuk sebagai PIC (assignee).',
      '**Ready for Testing / Testing:** Tahap transisi ketika developer telah menyelesaikan kode dan task dialihkan ke Tester (QA / Ops / Product).',
      '**Done:** Task yang telah lolos pengujian fungsional dan diverifikasi oleh Tester.',
    ],
  },
  {
    id: 'dual-assignee-testing',
    title: 'Prinsip Dual-Assignee & Alur Pengujian (Dev + QA)',
    summary:
      'Pemisahan peran pengerjaan kode (Developer) dan peran pengujian (Tester / QA).',
    rules: [
      'Setiap task memiliki dua penanggung jawab utama: pihak yang mengeksekusi kode (Developer) dan pihak yang menguji (Tester/QA).',
      'Ketika status task digeser ke kolom "Testing", task secara otomatis masuk ke dalam radar kerja/tanggung jawab tim Tester.',
      'Subtask di dalam task berfungsi sebagai checklist verifikasi bagi Tester untuk memastikan seluruh skenario pengujian terpenuhi.',
      'Hasil atau log testing wajib didokumentasikan di dalam aktivitas atau catatan task sebelum dipindahkan ke status Done.',
    ],
  },
  {
    id: 'definition-of-done',
    title: 'Definisi Selesai (Definition of Done / 100% Progress)',
    summary:
      'Kriteria mutlak agar sebuah task dan milestone dianggap 100% selesai.',
    rules: [
      'Sebuah task HANYA dianggap **100% selesai** apabila KEDUA tahapan (Development dan Testing) sudah tuntas diverifikasi.',
      'Jika hanya tahap development yang selesai namun belum diverifikasi oleh Tester, persentase progress belum mencapai 100%.',
      'Milestone project menghitung progress murni dari task yang berstatus Done terverifikasi.',
    ],
  },
  {
    id: 'workload-capacity-points',
    title: 'Manajemen Beban Kerja Tim & Formula Overload (Sistem 20 Poin)',
    summary:
      'Aturan penilaian beban kerja (workload) untuk mencegah developer burnout dan menjaga keseimbangan tim.',
    rules: [
      '**Formula Beban:** Beban kerja dihitung dari kombinasi **Urgency/Priority** dan sisa **Due Date**.',
      '**Base Weight:** Setiap task aktif memiliki bobot dasar sebesar 20 poin.',
      '**Pengaruh Urgency:** Task dengan prioritas High (+15 poin) atau Critical (+30 poin) memiliki bobot lebih besar dibanding Medium/Low.',
      '**Pengaruh Due Date:** Jika deadline tersisa sangat singkat (< 3 hari), bobot risiko melonjak karena tekanan waktu.',
      '**Status Kapasitas:**',
      '  - **Available (Kapasitas Tersedia):** Poin beban rendah (beban < kapasitas default tim). Anggota tim ini SANGAT DIREKOMENDASIKAN untuk menerima task baru.',
      '  - **Normal:** Beban kerja seimbang dan optimal.',
      '  - **Overload:** Beban melebihi batas ambang (threshold). Leader TIDAK BOLEH memberikan task prioritas tinggi baru kepada developer berstatus Overload demi mencegah burnout dan kegagalan delivery.',
    ],
  },
  {
    id: 'git-branch-naming',
    title: 'Konvensi Penamaan Git Branch & Integrasi Task',
    summary:
      'Format branch GitHub yang valid dan terhubung dengan detail task Workhub.',
    rules: [
      'Format branch yang direkomendasikan: `<tipe>/<issue-number>-<deskripsi-singkat>` (misal: `feat/issue-46-guardrails` atau `fix/issue-12-login-bug`).',
      'Nama branch hanya boleh mengandung huruf kecil, angka, strip (-), garis bawah (_), dan garis miring (/).',
      'Menghubungkan branch di task detail memungkinkan pelacakan otomatis commit dan pull request secara real-time.',
    ],
  },
];

/**
 * Returns formatted markdown string of all workflow rules for AI RAG context injection.
 */
export function getWorkflowRulesString(): string {
  const sections = WORKHUB_WORKFLOW_RULES.map((section) => {
    const rulesList = section.rules.map((r) => `- ${r}`).join('\n');
    return `### ${section.title}\n*${section.summary}*\n${rulesList}`;
  });

  return `## Aturan Alur Kerja & SOP Internal Workhub (Knowledge Base):\n\n${sections.join(
    '\n\n'
  )}`;
}

/**
 * Searches and returns relevant workflow rule sections based on query keywords.
 */
export function searchWorkflowRules(query: string): string {
  const lower = query.toLowerCase();

  const matched = WORKHUB_WORKFLOW_RULES.filter((section) => {
    const matchesTitle = section.title.toLowerCase().includes(lower);
    const matchesSummary = section.summary.toLowerCase().includes(lower);
    const matchesRules = section.rules.some((r) =>
      r.toLowerCase().includes(lower)
    );
    return matchesTitle || matchesSummary || matchesRules;
  });

  if (matched.length === 0) {
    // If no specific workflow keyword matched, return high-level summary
    return getWorkflowRulesString();
  }

  const sections = matched.map((section) => {
    const rulesList = section.rules.map((r) => `- ${r}`).join('\n');
    return `### ${section.title}\n${rulesList}`;
  });

  return `## SOP & Aturan Alur Kerja Relevan (Workhub RAG):\n\n${sections.join(
    '\n\n'
  )}`;
}
