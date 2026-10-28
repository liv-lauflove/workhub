import 'server-only';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  extractBranchNameFromRef,
  matchesTaskRepository,
} from './webhook-verifier';
import type {
  GitHubPushEventPayload,
  WebhookProcessResult,
} from '../types/github.types';
import type { Database } from '@/types/database.types';

type GithubCommitInsert =
  Database['public']['Tables']['github_commits']['Insert'];

/**
 * Handles GitHub "push" webhook events.
 * Matches the pushed branch name against tasks.github_branch AND filters by tasks.github_repo
 * (when configured) to guarantee multi-repository isolation across projects.
 * If matched, persists commits into github_commits table with idempotent upsert.
 *
 * @param payload - Parsed GitHub push event payload
 */
export async function handleGitHubPushEvent(
  payload: GitHubPushEventPayload
): Promise<WebhookProcessResult> {
  const branchName = extractBranchNameFromRef(payload.ref);
  const repositoryLabel =
    payload.repository?.full_name || payload.repository?.name || undefined;

  if (!branchName) {
    return {
      success: true,
      event: 'push',
      message: 'Empty or unresolvable branch ref. Push event skipped.',
      repository: repositoryLabel,
    };
  }

  // Branch deletion events should not create commit records
  if (payload.deleted) {
    return {
      success: true,
      event: 'push',
      message: `Branch "${branchName}" was deleted. No action needed.`,
      branch: branchName,
      repository: repositoryLabel,
    };
  }

  const commits = payload.commits || [];
  if (commits.length === 0) {
    return {
      success: true,
      event: 'push',
      message: `Push event on branch "${branchName}" contained no new commits.`,
      branch: branchName,
      repository: repositoryLabel,
      matchedTasksCount: 0,
      insertedCommitsCount: 0,
    };
  }

  const supabaseAdmin = createAdminClient();

  // Find candidate tasks linked to this branch name
  const { data: branchCandidates, error: taskQueryError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, project_id, github_branch, github_repo')
    .eq('github_branch', branchName);

  if (taskQueryError) {
    console.error(
      '[GitHub Webhook] Database error querying tasks for branch:',
      branchName,
      taskQueryError
    );
    return {
      success: false,
      event: 'push',
      message: `Failed to query tasks for branch "${branchName}": ${taskQueryError.message}`,
      branch: branchName,
      repository: repositoryLabel,
    };
  }

  // Strict multi-repo filtering:
  // Match tasks where github_repo IS NULL (wildcard) OR matches payload.repository (name / full_name)
  const matchedTasks = (branchCandidates || []).filter((task) =>
    matchesTaskRepository(task.github_repo, payload.repository)
  );

  if (matchedTasks.length === 0) {
    return {
      success: true,
      event: 'push',
      message: `Push event received for branch "${branchName}"${
        repositoryLabel ? ` on repository "${repositoryLabel}"` : ''
      }. No matching tasks found in Workhub.`,
      branch: branchName,
      repository: repositoryLabel,
      matchedTasksCount: 0,
      insertedCommitsCount: 0,
    };
  }

  // Build commit records for all matched tasks
  const commitRecords: GithubCommitInsert[] = [];

  for (const task of matchedTasks) {
    for (const commit of commits) {
      const authorUsername =
        commit.author?.username ||
        commit.committer?.username ||
        payload.pusher?.name ||
        commit.author?.name ||
        null;

      commitRecords.push({
        task_id: task.id,
        commit_sha: commit.id,
        commit_message: commit.message ? commit.message.trim() : null,
        author_username: authorUsername,
        committed_at: commit.timestamp || new Date().toISOString(),
        url: commit.url || null,
      });
    }
  }

  // Upsert into github_commits table
  const { error: insertError } = await supabaseAdmin
    .from('github_commits')
    .upsert(commitRecords, {
      onConflict: 'task_id, commit_sha',
      ignoreDuplicates: false,
    });

  if (insertError) {
    console.error(
      '[GitHub Webhook] Database error inserting commits into github_commits:',
      insertError
    );
    return {
      success: false,
      event: 'push',
      message: `Failed to insert commits: ${insertError.message}`,
      branch: branchName,
      repository: repositoryLabel,
      matchedTasksCount: matchedTasks.length,
    };
  }

  // Revalidate relevant pages so task detail reflects new commits immediately
  for (const task of matchedTasks) {
    revalidatePath(`/tasks/${task.id}`);
    if (task.project_id) {
      revalidatePath(`/projects/${task.project_id}`);
    }
  }
  revalidatePath('/tasks');

  return {
    success: true,
    event: 'push',
    message: `Berhasil mencatat ${commitRecords.length} commit untuk ${
      matchedTasks.length
    } task pada branch "${branchName}"${
      repositoryLabel ? ` (${repositoryLabel})` : ''
    }.`,
    branch: branchName,
    repository: repositoryLabel,
    matchedTasksCount: matchedTasks.length,
    insertedCommitsCount: commitRecords.length,
  };
}
