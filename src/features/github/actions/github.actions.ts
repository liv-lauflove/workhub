'use server';

import { getTaskCommits } from '../queries/github.queries';
import type { TaskGithubCommit } from '../types/github.types';

export interface RefreshCommitsResult {
  success: boolean;
  commits?: TaskGithubCommit[];
  error?: string;
}

/**
 * Server action untuk merefresh commit secara on-demand dari client component.
 */
export async function refreshTaskCommitsAction(
  taskId: string
): Promise<RefreshCommitsResult> {
  try {
    if (!taskId) {
      return { success: false, error: 'Task ID tidak valid.' };
    }
    const commits = await getTaskCommits(taskId);
    return { success: true, commits };
  } catch (err) {
    console.error('[GitHub Action] Gagal merefresh commit:', err);
    return {
      success: false,
      error: 'Terjadi kesalahan saat menyegarkan data commit.',
    };
  }
}

/**
 * Legacy stub placeholder retained for backward compatibility.
 */
export async function placeholderGithubAction() {
  return null;
}
