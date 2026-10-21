import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TaskGithubCommit } from '../types/github.types';

/**
 * Mengambil riwayat commit GitHub yang tersinkronisasi untuk suatu task.
 * Diurutkan berdasarkan committed_at menurun (terbaru di paling atas).
 *
 * @param taskId - UUID dari task terkait
 */
export async function getTaskCommits(
  taskId: string
): Promise<TaskGithubCommit[]> {
  if (!taskId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_commits')
    .select(
      'id, task_id, commit_sha, commit_message, author_username, committed_at, url'
    )
    .eq('task_id', taskId)
    .order('committed_at', { ascending: false });

  if (error) {
    console.error(
      `[GitHub Queries] Error fetching commits for task ${taskId}:`,
      error
    );
    return [];
  }

  return (data as TaskGithubCommit[]) || [];
}

/**
 * Legacy stub placeholder retained for backward compatibility.
 */
export async function getGithubCommits() {
  return [];
}
