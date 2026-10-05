/**
 * Utility functions for exporting dashboard performance reports to CSV format (PRD §9.5, Issue #33).
 */

import type {
  DashboardPerformanceData,
  DashboardExportTaskItem,
} from '../types/dashboard.types';

/**
 * Escapes a cell value according to RFC 4180 standards.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If the cell contains quotes, commas, or newlines, enclose in quotes and escape quotes with double quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats a date string into readable Indonesian format.
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates an RFC 4180 compliant CSV document string with UTF-8 BOM.
 */
export function generateDashboardCsv(
  performanceData: DashboardPerformanceData,
  tasks: DashboardExportTaskItem[],
  exporterName?: string
): string {
  const rows: string[][] = [];

  const {
    teamName,
    currentQuarter,
    metrics,
    priorityDistribution,
    memberCapacities,
  } = performanceData;

  // 1. Report Title & Metadata
  rows.push(['LAPORAN PERFORMA & BEBAN KERJA TIM - WORKHUB']);
  rows.push(['Tim', teamName]);
  rows.push(['Periode Kuartal', currentQuarter.label]);
  rows.push([
    'Waktu Ekspor',
    new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
  ]);
  if (exporterName) {
    rows.push(['Diekspor Oleh', exporterName]);
  }
  rows.push([]); // Empty row separator

  // 2. Metric Summary (KPIs)
  rows.push(['--- RINGKASAN METRIK PERFORMA (KPIS) ---']);
  rows.push(['Metrik', 'Nilai', 'Keterangan']);
  rows.push([
    'Total Tugas (Kuartal Ini)',
    String(metrics.totalTasks),
    'Total tugas aktif maupun selesai pada kuartal ini',
  ]);
  rows.push([
    'Tugas Selesai (Done)',
    String(metrics.completedTasks),
    'Tugas yang telah rampung',
  ]);
  rows.push([
    'Tugas Berjalan (In Progress/To Do)',
    String(metrics.inProgressTasks),
    'Tugas yang masih dalam pengerjaan',
  ]);
  rows.push([
    'Persentase Penyelesaian',
    `${metrics.completionRate}%`,
    'Tingkat keberhasilan penyelesaian tugas',
  ]);
  rows.push([
    'Total Project Aktif',
    `${metrics.activeProjects} dari ${metrics.totalProjects}`,
    'Project tim yang sedang berjalan',
  ]);
  rows.push([
    'Total Milestone Terkait',
    String(metrics.totalMilestones),
    'Milestone strategis tim',
  ]);
  rows.push([
    'Kapasitas Rata-rata Tim',
    `${metrics.teamCapacityPercentage}%`,
    'Persentase utilisasi kapasitas beban kerja',
  ]);
  rows.push([
    'Anggota Overload',
    String(metrics.overloadedMembersCount),
    'Anggota yang kapasitasnya melebihi ambang batas aman',
  ]);
  rows.push([]);

  // 3. Priority Distribution
  rows.push(['--- DISTRIBUSI PRIORITAS TUGAS ---']);
  rows.push(['Tingkat Prioritas', 'Jumlah Tugas', 'Persentase']);
  const totalPri = Math.max(priorityDistribution.total, 1);
  rows.push([
    'Urgent / Critical',
    String(priorityDistribution.urgent),
    `${Math.round((priorityDistribution.urgent / totalPri) * 100)}%`,
  ]);
  rows.push([
    'High',
    String(priorityDistribution.high),
    `${Math.round((priorityDistribution.high / totalPri) * 100)}%`,
  ]);
  rows.push([
    'Medium',
    String(priorityDistribution.medium),
    `${Math.round((priorityDistribution.medium / totalPri) * 100)}%`,
  ]);
  rows.push([
    'Low',
    String(priorityDistribution.low),
    `${Math.round((priorityDistribution.low / totalPri) * 100)}%`,
  ]);
  rows.push(['Total', String(priorityDistribution.total), '100%']);
  rows.push([]);

  // 4. Member Capacity Utilization
  rows.push(['--- KAPASITAS BEBAN KERJA ANGGOTA TIM ---']);
  rows.push([
    'Nama Anggota',
    'Role',
    'Total Bobot (Poin)',
    'Utilisasi Kapasitas',
    'Status Beban Kerja',
  ]);
  if (memberCapacities.length === 0) {
    rows.push(['Tidak ada anggota tim terdaftar', '-', '-', '-', '-']);
  } else {
    for (const member of memberCapacities) {
      rows.push([
        member.fullName,
        member.role === 'leader' ? 'Team Leader' : 'Team Member',
        String(member.totalWeight),
        `${member.capacityPercentage}%`,
        member.isOverloaded ? 'OVERLOAD (>100%)' : 'Aman (Normal)',
      ]);
    }
  }
  rows.push([]);

  // 5. Itemized Task List
  rows.push(['--- DAFTAR RINCIAN TUGAS PERIODE KUARTAL INI ---']);
  rows.push([
    'No',
    'Judul Tugas',
    'Project',
    'Penanggung Jawab (Assignee)',
    'Prioritas',
    'Status (Kolom)',
    'Tenggat Waktu (Due Date)',
    'Tanggal Dibuat',
  ]);

  if (tasks.length === 0) {
    rows.push([
      '-',
      'Tidak ada tugas yang terdaftar pada kuartal ini',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
    ]);
  } else {
    tasks.forEach((task, idx) => {
      rows.push([
        String(idx + 1),
        task.title,
        task.projectName || 'Tanpa Project',
        task.assigneeName || 'Belum Ditugaskan',
        task.priority.toUpperCase(),
        task.columnName,
        formatDate(task.dueDate),
        formatDate(task.createdAt),
      ]);
    });
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) and join lines with CRLF
  const csvContent =
    '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  return csvContent;
}
