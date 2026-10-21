import 'server-only';

import { getTeamWorkload } from '@/features/workload/queries/workload.queries';
import type {
  TeamWorkloadSummary,
  MemberWorkload,
} from '@/features/workload/types/workload.types';

export interface SanitizedMemberAvailability {
  fullName: string;
  role: string;
  position: string;
  activeTaskCount: number;
  totalPoints: number;
  capacityPercentage: number;
  status: 'AVAILABLE' | 'NORMAL' | 'OVERLOAD';
  priorityBreakdown: string;
  recommendation: string;
}

export interface SanitizedTeamWorkloadContext {
  teamName: string;
  totalMembers: number;
  availableCount: number;
  overloadCount: number;
  members: SanitizedMemberAvailability[];
  formattedContextString: string;
}

/**
 * Calculates human-readable availability status based on capacity percentage and overload flag.
 */
export function determineAvailabilityStatus(
  member: MemberWorkload
): 'AVAILABLE' | 'NORMAL' | 'OVERLOAD' {
  if (member.isOverloaded || member.capacityPercentage > 80) {
    return 'OVERLOAD';
  }
  if (member.capacityPercentage < 50 && member.activeTaskCount <= 2) {
    return 'AVAILABLE';
  }
  return 'NORMAL';
}

/**
 * Fetches and sanitizes team workload data into a PII-free format for AI RAG context injection.
 * Enforces zero direct raw table reads by LLM (Issue #97).
 */
export async function getSanitizedTeamWorkloadContext(
  targetTeamId?: string
): Promise<SanitizedTeamWorkloadContext | null> {
  try {
    const summary: TeamWorkloadSummary | null =
      await getTeamWorkload(targetTeamId);

    if (!summary || !summary.members || summary.members.length === 0) {
      return null;
    }

    const sanitizedMembers: SanitizedMemberAvailability[] = summary.members.map(
      (m) => {
        const status = determineAvailabilityStatus(m);
        const position = m.position || m.role || 'Team Member';

        const priorityParts: string[] = [];
        if (m.tasksSummary.urgentCount > 0)
          priorityParts.push(`${m.tasksSummary.urgentCount} Critical/Urgent`);
        if (m.tasksSummary.highCount > 0)
          priorityParts.push(`${m.tasksSummary.highCount} High`);
        if (m.tasksSummary.mediumCount > 0)
          priorityParts.push(`${m.tasksSummary.mediumCount} Medium`);
        if (m.tasksSummary.lowCount > 0)
          priorityParts.push(`${m.tasksSummary.lowCount} Low`);

        const priorityBreakdown =
          priorityParts.length > 0
            ? priorityParts.join(', ')
            : 'Tidak ada task aktif';

        let recommendation = '';
        if (status === 'AVAILABLE') {
          recommendation =
            'Sangat disarankan untuk diberikan task baru (kapasitas longgar).';
        } else if (status === 'NORMAL') {
          recommendation =
            'Kapasitas kerja optimal; dapat menerima task baru berbobot wajar.';
        } else {
          recommendation =
            'Overload / Kelebihan beban; JANGAN beri task baru untuk mencegah burnout.';
        }

        return {
          fullName: m.fullName || 'Anggota Tim',
          role: m.role,
          position,
          activeTaskCount: m.activeTaskCount,
          totalPoints: Math.round(m.totalWeight * 10) / 10,
          capacityPercentage: Math.round(m.capacityPercentage),
          status,
          priorityBreakdown,
          recommendation,
        };
      }
    );

    const availableMembers = sanitizedMembers.filter(
      (m) => m.status === 'AVAILABLE'
    );
    const overloadMembers = sanitizedMembers.filter(
      (m) => m.status === 'OVERLOAD'
    );

    // Build markdown string for AI Prompt
    const lines: string[] = [
      `[DATA KAPASITAS & BEBAN KERJA ANGGOTA TIM REAL-TIME (WORKHUB RAG)]`,
      `Tim: ${summary.teamName || 'Tim Aktif'}`,
      `Total Anggota: ${sanitizedMembers.length} | Status Available: ${availableMembers.length} orang | Status Overload: ${overloadMembers.length} orang`,
      `\nRincian Kapasitas Setiap Anggota:`,
    ];

    sanitizedMembers.forEach((m, idx) => {
      lines.push(
        `${idx + 1}. **${m.fullName}** (${m.position})` +
          `\n   - Status Kapasitas: **${m.status}** (${m.capacityPercentage}% terpakai, ${m.totalPoints} poin)` +
          `\n   - Jumlah Task Aktif: ${m.activeTaskCount} task (${m.priorityBreakdown})` +
          `\n   - Rekomendasi Sistem: ${m.recommendation}`
      );
    });

    lines.push(
      `\nPanduan Penugasan AI:\n` +
        `- Jika pengguna menanyakan siapa yang available untuk diberi task, prioritaskan merekomendasikan anggota yang berstatus **AVAILABLE**.\n` +
        `- Jelaskan alasan kapasitas poin dan jumlah task aktif mereka.\n` +
        `- Larang atau peringatkan jika pengguna berniat memberikan task kepada anggota berstatus **OVERLOAD**.`
    );

    return {
      teamName: summary.teamName,
      totalMembers: sanitizedMembers.length,
      availableCount: availableMembers.length,
      overloadCount: overloadMembers.length,
      members: sanitizedMembers,
      formattedContextString: lines.join('\n'),
    };
  } catch (err) {
    console.warn(
      '[RAG Workload Aggregator] Failed to fetch team workload context:',
      err
    );
    return null;
  }
}
