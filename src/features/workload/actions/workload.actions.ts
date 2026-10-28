'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/types/global';
import {
  getTeamWorkload,
  getMemberWorkload,
} from '../queries/workload.queries';
import type {
  TeamWorkloadSummary,
  MemberWorkload,
} from '../types/workload.types';

/**
 * Server action to fetch real-time team workload calculation.
 * Verifies authentication and respects Supabase RLS.
 */
export async function getTeamWorkloadAction(
  teamId?: string
): Promise<ActionState<TeamWorkloadSummary>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi autentikasi tidak valid atau telah berakhir.'] },
      };
    }

    const workload = await getTeamWorkload(teamId);

    if (!workload) {
      return {
        success: false,
        error: {
          _form: [
            'Data beban kerja tim tidak ditemukan atau belum bergabung ke tim.',
          ],
        },
      };
    }

    return {
      success: true,
      data: workload,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat menghitung beban kerja tim.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

/**
 * Server action to fetch real-time workload for a specific member.
 */
export async function getMemberWorkloadAction(
  targetUserId?: string
): Promise<ActionState<MemberWorkload>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi autentikasi tidak valid atau telah berakhir.'] },
      };
    }

    const userId = targetUserId || user.id;
    const memberWorkload = await getMemberWorkload(userId);

    if (!memberWorkload) {
      return {
        success: false,
        error: { _form: ['Data beban kerja anggota tidak ditemukan.'] },
      };
    }

    return {
      success: true,
      data: memberWorkload,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat menghitung beban kerja anggota.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateBaselinePointsInput {
  teamId: string;
  baselinePoints: number;
}

/**
 * Server action to update a team's baseline capacity points.
 * Restricted to team leaders.
 */
export async function updateBaselinePointsAction({
  teamId,
  baselinePoints,
}: UpdateBaselinePointsInput): Promise<
  ActionState<{ teamId: string; baselinePoints: number }>
> {
  if (!teamId || baselinePoints <= 0) {
    return {
      success: false,
      error: {
        _form: ['Team ID dan baseline points valid (> 0) wajib disertakan.'],
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi autentikasi tidak valid atau telah berakhir.'] },
      };
    }

    // Verify user is leader of this team
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'leader' || profile.team_id !== teamId) {
      return {
        success: false,
        error: {
          _form: ['Hanya Team Leader yang berwenang mengubah kapasitas tim.'],
        },
      };
    }

    // Upsert baseline points into capacity_settings
    const { error: upsertError } = await supabase
      .from('capacity_settings')
      .upsert({
        team_id: teamId,
        baseline_points: baselinePoints,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      return {
        success: false,
        error: {
          _form: [
            upsertError.message || 'Gagal menyimpan pengaturan kapasitas tim.',
          ],
        },
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/team');

    return {
      success: true,
      data: {
        teamId,
        baselinePoints,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat memperbarui kapasitas tim.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}
