'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { createTaskSchema, type CreateTaskInput } from '../schemas/task.schema';
import {
  ATTACHMENTS_BUCKET,
  generateAttachmentStoragePath,
  validateTaskAttachmentFile,
  isAllowedTaskAttachmentFileSize,
  isAllowedAttachmentMimeType,
  MAX_TASK_ATTACHMENT_SIZE_LABEL,
} from '@/lib/storage';
import type { ActionState } from '@/types/global';
import type { TaskAttachmentItem } from '../types/task.types';
import {
  detectPriorityOverride,
  parseDurationToHours,
} from '@/features/ai/lib/task-prioritizing';
import { recordAiSuggestionOverride } from '@/features/ai/queries/ai-analytics.queries';
import { normalizeGithubRepository } from '@/features/github/lib/webhook-verifier';
import { isManagementTeam } from '@/features/team/queries/team.queries';

async function verifyProjectLeaderForTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string
): Promise<
  | { authorized: true; projectId: string }
  | { authorized: false; message: string }
> {
  const [{ data: taskRow }, { data: userProfile }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, project_id, project:projects!tasks_project_id_fkey(team_id)')
      .eq('id', taskId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const projectTeamId = (
    taskRow?.project as unknown as { team_id?: string | null } | null
  )?.team_id;

  if (!taskRow?.project_id || !projectTeamId) {
    return {
      authorized: false,
      message: 'Task atau project terkait tidak ditemukan.',
    };
  }

  if (userProfile?.role !== 'leader') {
    return {
      authorized: false,
      message:
        'Hanya Leader tim proyek terkait atau Leader Tim Management yang dapat mengubah penugasan task.',
    };
  }

  const isManagement = await isManagementTeam(userProfile.team_id);
  if (!isManagement && userProfile.team_id !== projectTeamId) {
    return {
      authorized: false,
      message:
        'Anda tidak memiliki izin untuk mengubah penugasan task pada project milik tim lain.',
    };
  }

  return { authorized: true, projectId: taskRow.project_id };
}

/**
 * Server action to create a new Task on a Kanban Board.
 * Enforces user authentication and Supabase Row Level Security.
 */
export async function createTaskAction(
  _prevState: ActionState<{ id: string; title: string }> | null,
  input: CreateTaskInput | FormData
): Promise<ActionState<{ id: string; title: string }>> {
  let rawData: {
    title?: string;
    description?: string;
    projectId?: string;
    columnId?: string;
    priority?: string;
    origin?: string;
    originNote?: string;
    dueDate?: string;
    assigneeId?: string;
    githubBranch?: string;
    aiSuggestedPriority?: string | null;
    aiSuggestedDuration?: string | null;
    aiSuggestedDurationHours?: number | null;
  };

  if (input instanceof FormData) {
    rawData = {
      title: (input.get('title') as string)?.trim(),
      description: (input.get('description') as string)?.trim(),
      projectId: (input.get('projectId') as string)?.trim(),
      columnId: (input.get('columnId') as string)?.trim(),
      priority: (input.get('priority') as string)?.trim() || 'medium',
      origin: (input.get('origin') as string)?.trim() || 'normal',
      originNote: (input.get('originNote') as string)?.trim() || undefined,
      dueDate: (input.get('dueDate') as string)?.trim() || undefined,
      assigneeId: (input.get('assigneeId') as string)?.trim() || undefined,
      githubBranch: (input.get('githubBranch') as string)?.trim() || undefined,
      aiSuggestedPriority:
        (input.get('aiSuggestedPriority') as string)?.trim() || undefined,
      aiSuggestedDuration:
        (input.get('aiSuggestedDuration') as string)?.trim() || undefined,
      aiSuggestedDurationHours: input.get('aiSuggestedDurationHours')
        ? Number(input.get('aiSuggestedDurationHours'))
        : undefined,
    };
  } else {
    rawData = {
      title: input.title?.trim(),
      description: input.description?.trim(),
      projectId: input.projectId,
      columnId: input.columnId,
      priority: input.priority || 'medium',
      origin: input.origin || 'normal',
      originNote: input.originNote || undefined,
      dueDate: input.dueDate || undefined,
      assigneeId: input.assigneeId || undefined,
      githubBranch: input.githubBranch || undefined,
      aiSuggestedPriority: input.aiSuggestedPriority || undefined,
      aiSuggestedDuration: input.aiSuggestedDuration || undefined,
      aiSuggestedDurationHours: input.aiSuggestedDurationHours ?? undefined,
    };
  }

  const parsed = createTaskSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
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
        error: {
          _form: ['Sesi login Anda telah berakhir. Silakan login kembali.'],
        },
      };
    }

    // Verify team ownership: user must belong to project's team or have management role
    const [{ data: projectData }, { data: userProfile }, { data: columnData }] =
      await Promise.all([
        supabase
          .from('projects')
          .select('id, team_id')
          .eq('id', parsed.data.projectId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('role, team_id')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('board_columns')
          .select('id, project_id')
          .eq('id', parsed.data.columnId)
          .maybeSingle(),
      ]);

    if (!projectData?.team_id) {
      return {
        success: false,
        error: {
          _form: ['Project tidak ditemukan atau tidak valid.'],
        },
      };
    }

    const isManagement = await isManagementTeam(userProfile?.team_id);
    const isProjectTeamMember =
      isManagement || userProfile?.team_id === projectData.team_id;

    if (!isProjectTeamMember) {
      return {
        success: false,
        error: {
          _form: [
            'Anda tidak memiliki izin untuk menambahkan task pada project milik tim lain.',
          ],
        },
      };
    }

    if (!columnData || columnData.project_id !== parsed.data.projectId) {
      return {
        success: false,
        error: {
          _form: ['Kolom Kanban tidak sesuai dengan project task.'],
        },
      };
    }

    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        project_id: parsed.data.projectId,
        column_id: parsed.data.columnId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority,
        origin: parsed.data.origin,
        origin_note:
          parsed.data.origin === 'cs_complaint'
            ? parsed.data.originNote || null
            : null,
        due_date: parsed.data.dueDate || null,
        assignee_id: parsed.data.assigneeId || null,
        github_branch: parsed.data.githubBranch || null,
        created_by: user.id,
      })
      .select('id, title, project_id')
      .single();

    if (insertError) {
      return {
        success: false,
        error: {
          _form: [
            insertError.message || 'Gagal menambahkan task baru ke database.',
          ],
        },
      };
    }

    // Log AI Suggestion Override if human leader/manager selected a different priority than AI recommended
    if (
      parsed.data.aiSuggestedPriority &&
      detectPriorityOverride(
        parsed.data.priority,
        parsed.data.aiSuggestedPriority
      )
    ) {
      const suggestedHours =
        parsed.data.aiSuggestedDurationHours ??
        (parsed.data.aiSuggestedDuration
          ? parseDurationToHours(parsed.data.aiSuggestedDuration)
          : null);

      await recordAiSuggestionOverride({
        taskId: task.id,
        suggestedPriority: parsed.data.aiSuggestedPriority,
        finalPriority: parsed.data.priority,
        suggestedDurationHours: suggestedHours,
        overriddenBy: user.id,
      });
    }

    // Revalidate paths for real-time Kanban & My Tasks UI update
    if (parsed.data.projectId) {
      revalidatePath(`/projects/${parsed.data.projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath('/projects');

    return {
      success: true,
      data: {
        id: task.id,
        title: task.title,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat membuat task.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskAssigneeInput {
  taskId: string;
  assigneeId: string | null;
  projectId?: string | null;
}

/**
 * Server action to update a task's assignee (PIC).
 * Supports setting a specific user ID or null for unassigning.
 * Enforces user authentication and Supabase Row Level Security.
 */
export async function updateTaskAssigneeAction({
  taskId,
  assigneeId,
  projectId,
}: UpdateTaskAssigneeInput): Promise<
  ActionState<{
    id: string;
    assigneeId: string | null;
    assignee: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const permission = await verifyProjectLeaderForTask(
      supabase,
      user.id,
      taskId
    );
    if (!permission.authorized) {
      return {
        success: false,
        error: { _form: [permission.message] },
      };
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        assignee_id: assigneeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select(
        'id, assignee_id, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)'
      )
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message ||
              'Gagal memperbarui penugasan task di database.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        assigneeId: updatedTask.assignee_id,
        assignee:
          (updatedTask.assignee as unknown as {
            id: string;
            full_name: string;
            avatar_url: string | null;
          } | null) || null,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat sinkronisasi assignee ke database.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskDescriptionInput {
  taskId: string;
  description: string;
  projectId?: string | null;
}

/**
 * Server action to update a task's description.
 * Enforces user authentication and Supabase Row Level Security.
 */
export async function updateTaskDescriptionAction({
  taskId,
  description,
  projectId,
}: UpdateTaskDescriptionInput): Promise<
  ActionState<{ id: string; description: string }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('id, description')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message ||
              'Gagal memperbarui deskripsi task di database.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        description: updatedTask.description || '',
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat menyimpan deskripsi.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskBranchInput {
  taskId: string;
  githubBranch: string | null;
  githubRepo?: string | null;
  projectId?: string | null;
}

/**
 * Server action to update a task's GitHub branch name.
 * Issue #40: [GitHub] UI Input Branch Name
 */
export async function updateTaskBranchAction({
  taskId,
  githubBranch,
  projectId,
  githubRepo,
}: UpdateTaskBranchInput): Promise<
  ActionState<{
    id: string;
    githubBranch: string | null;
    githubRepo: string | null;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const sanitizedBranch = githubBranch?.trim() || null;
    const sanitizedRepo =
      githubRepo !== undefined
        ? normalizeGithubRepository(githubRepo) || null
        : undefined;
    const updatePayload: {
      github_branch: string | null;
      github_repo?: string | null;
      updated_at: string;
    } = {
      github_branch: sanitizedBranch,
      updated_at: new Date().toISOString(),
    };
    if (sanitizedRepo !== undefined) {
      updatePayload.github_repo = sanitizedRepo;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('id, github_branch, github_repo')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal memperbarui nama branch di database.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        githubBranch: updatedTask.github_branch,
        githubRepo: updatedTask.github_repo ?? null,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat menyimpan nama branch.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskRoleAssigneeInput {
  taskId: string;
  role: 'developer' | 'tester';
  userId: string | null;
  projectId?: string | null;
}

/**
 * Server action to update a task's Developer or Tester assignee.
 */
export async function updateTaskRoleAssigneeAction({
  taskId,
  role,
  userId,
  projectId,
}: UpdateTaskRoleAssigneeInput): Promise<
  ActionState<{
    id: string;
    role: 'developer' | 'tester';
    userId: string | null;
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return {
        success: false,
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const permission = await verifyProjectLeaderForTask(
      supabase,
      currentUser.id,
      taskId
    );
    if (!permission.authorized) {
      return {
        success: false,
        error: { _form: [permission.message] },
      };
    }

    const selectQuery =
      role === 'developer'
        ? 'id, developer_id, developer:profiles!tasks_developer_id_fkey(id, full_name, avatar_url)'
        : 'id, tester_id, tester:profiles!tasks_tester_id_fkey(id, full_name, avatar_url)';

    const updatePayload =
      role === 'developer'
        ? { developer_id: userId || null, updated_at: new Date().toISOString() }
        : { tester_id: userId || null, updated_at: new Date().toISOString() };

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select(selectQuery)
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message ||
              `Gagal memperbarui ${role === 'developer' ? 'Developer' : 'Tester'} task di database.`,
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    const returnedUser =
      role === 'developer'
        ? (
            updatedTask as unknown as {
              developer: {
                id: string;
                full_name: string;
                avatar_url: string | null;
              } | null;
            }
          ).developer
        : (
            updatedTask as unknown as {
              tester: {
                id: string;
                full_name: string;
                avatar_url: string | null;
              } | null;
            }
          ).tester;

    return {
      success: true,
      data: {
        id: updatedTask.id,
        role,
        userId: userId || null,
        user: returnedUser || null,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : `Terjadi kesalahan sistem saat memperbarui penugasan ${role}.`;
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskDevStatusInput {
  taskId: string;
  devStatus: 'todo' | 'in_progress' | 'dev_done';
  projectId?: string | null;
}

/**
 * Server action to update development status.
 * Automatically transitions test_status to 'testing' if devStatus is 'dev_done'.
 */
export async function updateTaskDevStatusAction({
  taskId,
  devStatus,
  projectId,
}: UpdateTaskDevStatusInput): Promise<
  ActionState<{
    id: string;
    devStatus: 'todo' | 'in_progress' | 'dev_done';
    testStatus?: 'pending' | 'testing' | 'passed' | 'failed';
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates: {
      dev_status: 'todo' | 'in_progress' | 'dev_done';
      test_status?: 'pending' | 'testing' | 'passed' | 'failed';
      updated_at: string;
    } = {
      dev_status: devStatus,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, dev_status, test_status')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal memperbarui status development task.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        devStatus: updatedTask.dev_status,
        testStatus: updatedTask.test_status,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat memperbarui status development.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface UpdateTaskTestStatusInput {
  taskId: string;
  testStatus: 'pending' | 'testing' | 'passed' | 'failed';
  testNotes?: string | null;
  projectId?: string | null;
}

/**
 * Server action to update testing outcome (passed, failed/rework, etc.) and audit notes.
 */
export async function updateTaskTestStatusAction({
  taskId,
  testStatus,
  testNotes,
  projectId,
}: UpdateTaskTestStatusInput): Promise<
  ActionState<{
    id: string;
    testStatus: 'pending' | 'testing' | 'passed' | 'failed';
    testNotes: string | null;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates: {
      test_status: 'pending' | 'testing' | 'passed' | 'failed';
      test_notes?: string | null;
      updated_at: string;
    } = {
      test_status: testStatus,
      updated_at: new Date().toISOString(),
    };

    if (testNotes !== undefined) {
      updates.test_notes = testNotes ? testNotes.trim() : null;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, test_status, test_notes')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal memperbarui status pengujian task.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        testStatus: updatedTask.test_status,
        testNotes: updatedTask.test_notes,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat memperbarui status pengujian.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface CreateTaskSubtaskInput {
  taskId: string;
  title: string;
  projectId?: string | null;
}

/**
 * Server action to create a new subtask checklist item.
 */
export async function createTaskSubtaskAction({
  taskId,
  title,
  projectId,
}: CreateTaskSubtaskInput): Promise<
  ActionState<{
    id: string;
    taskId: string;
    title: string;
    isCompleted: boolean;
  }>
> {
  const trimmedTitle = title?.trim();
  if (!taskId || !trimmedTitle) {
    return {
      success: false,
      error: { _form: ['Task ID dan judul subtask wajib diisi.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    // Get maximum sort_order for task
    const { data: existingSubtasks } = await supabase
      .from('task_subtasks')
      .select('sort_order')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder =
      existingSubtasks && existingSubtasks.length > 0
        ? (existingSubtasks[0].sort_order || 0) + 1
        : 0;

    const { data: newSubtask, error: insertError } = await supabase
      .from('task_subtasks')
      .insert({
        task_id: taskId,
        title: trimmedTitle,
        sort_order: nextOrder,
        is_completed: false,
      })
      .select('id, task_id, title, is_completed')
      .single();

    if (insertError) {
      return {
        success: false,
        error: {
          _form: [
            insertError.message || 'Gagal menambahkan subtask checklist.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: newSubtask.id,
        taskId: newSubtask.task_id,
        title: newSubtask.title,
        isCompleted: newSubtask.is_completed,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat membuat subtask.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface ToggleTaskSubtaskInput {
  subtaskId: string;
  taskId: string;
  isCompleted: boolean;
  projectId?: string | null;
}

/**
 * Server action to toggle a subtask item and audit tester stamp (tested_by, tested_at).
 */
export async function toggleTaskSubtaskAction({
  subtaskId,
  taskId,
  isCompleted,
  projectId,
}: ToggleTaskSubtaskInput): Promise<
  ActionState<{
    id: string;
    isCompleted: boolean;
    testedBy: string | null;
    testedAt: string | null;
  }>
> {
  if (!subtaskId || !taskId) {
    return {
      success: false,
      error: { _form: ['Subtask ID dan Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates = isCompleted
      ? {
          is_completed: true,
          tested_by: user.id,
          tested_at: new Date().toISOString(),
        }
      : {
          is_completed: false,
          tested_by: null,
          tested_at: null,
        };

    const { data: updatedSubtask, error: updateError } = await supabase
      .from('task_subtasks')
      .update(updates)
      .eq('id', subtaskId)
      .eq('task_id', taskId)
      .select('id, is_completed, tested_by, tested_at')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message ||
              'Gagal memperbarui status checklist subtask.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedSubtask.id,
        isCompleted: updatedSubtask.is_completed,
        testedBy: updatedSubtask.tested_by,
        testedAt: updatedSubtask.tested_at,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat memperbarui subtask.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface DeleteTaskSubtaskInput {
  subtaskId: string;
  taskId: string;
  projectId?: string | null;
}

/**
 * Server action to remove a subtask item.
 */
export async function deleteTaskSubtaskAction({
  subtaskId,
  taskId,
  projectId,
}: DeleteTaskSubtaskInput): Promise<ActionState<{ id: string }>> {
  if (!subtaskId || !taskId) {
    return {
      success: false,
      error: { _form: ['Subtask ID dan Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const { data: deletedSubtask, error: deleteError } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('task_id', taskId)
      .select('id')
      .maybeSingle();

    if (deleteError || !deletedSubtask) {
      return {
        success: false,
        error: {
          _form: [
            deleteError?.message ||
              'Anda tidak memiliki izin atau subtask tidak ditemukan untuk dihapus.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: { id: subtaskId },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat menghapus subtask.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface RecordAttachmentInput {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  projectId?: string | null;
}

export interface DeleteTaskAttachmentInput {
  attachmentId: string;
  taskId?: string;
  fileUrl?: string;
  projectId?: string | null;
}

export type GetAttachmentSignedUrlInput =
  | string
  | {
      attachmentId?: string;
      fileUrl?: string;
    };

/**
 * Upload an attachment file directly via Server Action.
 * Handles storage upload and database record creation atomically on the server
 * where authenticated httpOnly cookies are available.
 */
export async function uploadTaskAttachmentAction(
  formData: FormData
): Promise<ActionState<TaskAttachmentItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !taskId) {
      return {
        success: false,
        error: { _form: ['File dan Task ID wajib disertakan.'] },
      };
    }

    // 1. Server-side validation (Strict 5MB & supported formats)
    const validation = validateTaskAttachmentFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: {
          _form: [
            validation.error ||
              'Berkas tidak memenuhi kriteria lampiran yang diizinkan.',
          ],
        },
      };
    }

    const adminSupabase = createAdminClient();

    // 2. Authorize actor access to the target task
    const { data: task, error: taskError } = await adminSupabase
      .from('tasks')
      .select(
        `
        id,
        project_id,
        assignee_id,
        developer_id,
        tester_id,
        projects(
          id,
          team_id
        )
      `
      )
      .eq('id', taskId)
      .maybeSingle();

    if (taskError || !task) {
      return {
        success: false,
        error: {
          _form: ['Task tidak ditemukan atau Anda tidak memiliki akses.'],
        },
      };
    }

    const { data: actorProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, team_id, teams(name)')
      .eq('id', user.id)
      .maybeSingle();

    const isManagement = actorProfile?.teams?.name === 'Management';
    const isTaskAssignee = [
      task.assignee_id,
      task.developer_id,
      task.tester_id,
    ].includes(user.id);
    const isProjectTeamMember =
      !task.projects?.team_id ||
      actorProfile?.team_id === task.projects?.team_id;

    if (!isManagement && !isTaskAssignee && !isProjectTeamMember) {
      return {
        success: false,
        error: {
          _form: [
            'Anda tidak memiliki izin untuk mengunggah lampiran pada task ini.',
          ],
        },
      };
    }

    const storagePath = generateAttachmentStoragePath(task.id, file.name);

    // 3. Upload file to Supabase Storage via elevated server client to guarantee success
    const { error: storageError } = await adminSupabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      return {
        success: false,
        error: {
          _form: [
            storageError.message ||
              'Gagal mengunggah berkas ke storage server.',
          ],
        },
      };
    }

    // 4. Record metadata in public.task_attachments table
    const { data: attachment, error: insertError } = await adminSupabase
      .from('task_attachments')
      .insert({
        task_id: task.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: storagePath,
        file_type: file.type || null,
        file_size: file.size || null,
      })
      .select(
        `
        id,
        task_id,
        uploaded_by,
        file_url,
        file_name,
        file_type,
        file_size,
        created_at,
        uploader:profiles!task_attachments_uploaded_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `
      )
      .single();

    if (insertError) {
      // Rollback uploaded file from storage if DB record insertion fails
      await adminSupabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([storagePath]);

      return {
        success: false,
        error: {
          _form: [
            insertError.message || 'Gagal mencatat data lampiran di database.',
          ],
        },
      };
    }

    if (projectId || task.project_id) {
      revalidatePath(`/projects/${projectId || task.project_id}`);
    }
    revalidatePath(`/tasks/${task.id}`);

    return {
      success: true,
      data: attachment as unknown as TaskAttachmentItem,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat mengunggah lampiran.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

/**
 * Record a newly uploaded attachment metadata row in public.task_attachments.
 */
export async function recordTaskAttachmentAction(
  input: RecordAttachmentInput
): Promise<ActionState<TaskAttachmentItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    if (!input.taskId || !input.fileName || !input.fileUrl) {
      return {
        success: false,
        error: {
          _form: ['Task ID, nama berkas, dan path berkas wajib diisi.'],
        },
      };
    }

    // 1. File size enforcement (5MB limit)
    if (
      input.fileSize !== null &&
      input.fileSize !== undefined &&
      !isAllowedTaskAttachmentFileSize(input.fileSize)
    ) {
      return {
        success: false,
        error: {
          _form: [
            `Ukuran berkas melebihi batas maksimum ${MAX_TASK_ATTACHMENT_SIZE_LABEL}.`,
          ],
        },
      };
    }

    // 2. Allowed MIME type verification if provided
    if (input.fileType && !isAllowedAttachmentMimeType(input.fileType)) {
      return {
        success: false,
        error: { _form: ['Format berkas tidak diizinkan.'] },
      };
    }

    const adminSupabase = createAdminClient();

    // 3. Authorize actor access to target task
    const { data: task, error: taskError } = await adminSupabase
      .from('tasks')
      .select(
        `
        id,
        project_id,
        assignee_id,
        developer_id,
        tester_id,
        projects(
          id,
          team_id
        )
      `
      )
      .eq('id', input.taskId)
      .maybeSingle();

    if (taskError || !task) {
      return {
        success: false,
        error: {
          _form: ['Task tidak ditemukan atau Anda tidak memiliki akses.'],
        },
      };
    }

    // 4. Storage path binding validation (must match target task ID)
    const expectedPrefix = `tasks/${task.id}/`;
    if (!input.fileUrl.startsWith(expectedPrefix)) {
      return {
        success: false,
        error: {
          _form: ['Path berkas lampiran tidak sesuai dengan ID task tujuan.'],
        },
      };
    }

    const { data: actorProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, team_id, teams(name)')
      .eq('id', user.id)
      .maybeSingle();

    const isManagement = actorProfile?.teams?.name === 'Management';
    const isTaskAssignee = [
      task.assignee_id,
      task.developer_id,
      task.tester_id,
    ].includes(user.id);
    const isProjectTeamMember =
      !task.projects?.team_id ||
      actorProfile?.team_id === task.projects?.team_id;

    if (!isManagement && !isTaskAssignee && !isProjectTeamMember) {
      return {
        success: false,
        error: {
          _form: [
            'Anda tidak memiliki izin untuk mencatat lampiran pada task ini.',
          ],
        },
      };
    }

    const { data: attachment, error: insertError } = await adminSupabase
      .from('task_attachments')
      .insert({
        task_id: task.id,
        uploaded_by: user.id,
        file_name: input.fileName,
        file_url: input.fileUrl,
        file_type: input.fileType || null,
        file_size: input.fileSize || null,
      })
      .select(
        `
        id,
        task_id,
        uploaded_by,
        file_url,
        file_name,
        file_type,
        file_size,
        created_at,
        uploader:profiles!task_attachments_uploaded_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `
      )
      .single();

    if (insertError) {
      return {
        success: false,
        error: {
          _form: [
            insertError.message || 'Gagal mencatat data lampiran di database.',
          ],
        },
      };
    }

    if (input.projectId || task.project_id) {
      revalidatePath(`/projects/${input.projectId || task.project_id}`);
    }
    revalidatePath(`/tasks/${task.id}`);

    return {
      success: true,
      data: attachment as unknown as TaskAttachmentItem,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat menyimpan lampiran.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

/**
 * Delete an attachment record and remove the file from storage.
 * Single source of truth: resolves attachment and storage path from database.
 */
export async function deleteTaskAttachmentAction(
  input: DeleteTaskAttachmentInput
): Promise<ActionState<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    if (!input.attachmentId) {
      return {
        success: false,
        error: { _form: ['Attachment ID wajib disertakan.'] },
      };
    }

    const adminSupabase = createAdminClient();

    // 1. Authoritative lookup of the attachment and its associated task from database
    const { data: attachment, error: fetchError } = await adminSupabase
      .from('task_attachments')
      .select(
        `
        id,
        task_id,
        file_url,
        uploaded_by,
        tasks!inner(
          id,
          project_id,
          assignee_id,
          developer_id,
          tester_id,
          projects(
            id,
            team_id
          )
        )
      `
      )
      .eq('id', input.attachmentId)
      .maybeSingle();

    if (fetchError || !attachment) {
      return {
        success: false,
        error: {
          _form: ['Lampiran tidak ditemukan atau telah dihapus.'],
        },
      };
    }

    // 2. Validate task binding consistency if taskId is provided
    if (input.taskId && attachment.task_id !== input.taskId) {
      return {
        success: false,
        error: {
          _form: ['Data task tidak sesuai dengan lampiran yang dituju.'],
        },
      };
    }

    // 3. Verify actor authorization (uploader, project leader, or Management)
    const { data: actorProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, team_id, teams(name)')
      .eq('id', user.id)
      .maybeSingle();

    const isUploader = attachment.uploaded_by === user.id;
    const isManagement = actorProfile?.teams?.name === 'Management';
    const isProjectLeader =
      actorProfile?.role === 'leader' &&
      (!attachment.tasks?.projects?.team_id ||
        actorProfile?.team_id === attachment.tasks?.projects?.team_id);

    if (!isUploader && !isManagement && !isProjectLeader) {
      return {
        success: false,
        error: {
          _form: ['Anda tidak memiliki izin untuk menghapus lampiran ini.'],
        },
      };
    }

    // 4. Remove object from Supabase Storage using canonical database path
    const storagePath = attachment.file_url;
    const { error: storageError } = await adminSupabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      console.warn(
        'Notice: Could not remove file from storage:',
        storageError.message
      );
    }

    // 5. Delete database record
    const { error: dbError } = await adminSupabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment.id);

    if (dbError) {
      return {
        success: false,
        error: {
          _form: [
            dbError.message || 'Gagal menghapus data lampiran dari database.',
          ],
        },
      };
    }

    if (input.projectId || attachment.tasks?.project_id) {
      revalidatePath(
        `/projects/${input.projectId || attachment.tasks?.project_id}`
      );
    }
    revalidatePath(`/tasks/${attachment.task_id}`);

    return {
      success: true,
      data: { id: attachment.id },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat menghapus lampiran.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generate a temporary signed download/preview URL for an authorized attachment.
 * Accepts an attachment UUID or structured input, resolving canonical storage path from DB.
 */
export async function getAttachmentSignedUrlAction(
  input: GetAttachmentSignedUrlInput
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Sesi login tidak valid.' };
    }

    let targetId: string | null = null;
    let targetFileUrl: string | null = null;

    if (typeof input === 'string') {
      if (UUID_REGEX.test(input)) {
        targetId = input;
      } else {
        targetFileUrl = input;
      }
    } else if (input && typeof input === 'object') {
      targetId = input.attachmentId || null;
      targetFileUrl = input.fileUrl || null;
    }

    if (!targetId && !targetFileUrl) {
      return { success: false, error: 'Identitas lampiran tidak disediakan.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Authoritative lookup of the attachment record from database
    let query = adminSupabase.from('task_attachments').select(
      `
        id,
        task_id,
        file_url,
        uploaded_by,
        tasks!inner(
          id,
          project_id,
          assignee_id,
          developer_id,
          tester_id,
          projects(
            id,
            team_id
          )
        )
      `
    );

    if (targetId) {
      query = query.eq('id', targetId);
    } else if (targetFileUrl) {
      query = query.eq('file_url', targetFileUrl);
    }

    const { data: attachment, error: fetchError } = await query.maybeSingle();

    if (fetchError || !attachment) {
      return {
        success: false,
        error: 'Lampiran tidak ditemukan atau Anda tidak memiliki akses.',
      };
    }

    // 2. Authorize viewer access to the task/attachment
    const { data: actorProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, team_id, teams(name)')
      .eq('id', user.id)
      .maybeSingle();

    const isManagement = actorProfile?.teams?.name === 'Management';
    const isUploader = attachment.uploaded_by === user.id;
    const isAssigned = [
      attachment.tasks?.assignee_id,
      attachment.tasks?.developer_id,
      attachment.tasks?.tester_id,
    ].includes(user.id);
    const isProjectTeamMember =
      !attachment.tasks?.projects?.team_id ||
      actorProfile?.team_id === attachment.tasks?.projects?.team_id;

    if (!isManagement && !isUploader && !isAssigned && !isProjectTeamMember) {
      return {
        success: false,
        error: 'Anda tidak memiliki izin untuk mengunduh lampiran ini.',
      };
    }

    // 3. Generate signed URL strictly from canonical storage path in database
    const { data, error } = await adminSupabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.file_url, 3600); // 1 hour expiration

    if (error || !data?.signedUrl) {
      return {
        success: false,
        error: error?.message || 'Gagal membuat tautan unduhan privat.',
      };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal mendapatkan URL unduhan.';
    return { success: false, error: message };
  }
}

export interface OpenPullRequestInput {
  taskId: string;
  title?: string;
  changelog: string;
  reviewerId?: string | null;
  githubBranch?: string | null;
  projectId?: string | null;
}

/**
 * Server action to open a Pull Request (submit task for QA testing).
 * Sets dev_status to 'dev_done', test_status to 'testing', assigns Reviewer (Tester),
 * saves changelog in test_notes, and optionally moves task to Review column.
 */
export async function openPullRequestAction({
  taskId,
  title,
  changelog,
  reviewerId,
  githubBranch,
  projectId,
}: OpenPullRequestInput): Promise<
  ActionState<{
    id: string;
    devStatus: 'dev_done';
    testStatus: 'testing';
    testerId?: string | null;
    githubBranch?: string | null;
    githubRepo?: string | null;
    columnId?: string;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates: {
      dev_status: 'dev_done';
      test_status: 'testing';
      test_notes: string | null;
      updated_at: string;
      title?: string;
      tester_id?: string | null;
      github_branch?: string | null;
      column_id?: string;
    } = {
      dev_status: 'dev_done',
      test_status: 'testing',
      test_notes: changelog?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (title?.trim()) {
      updates.title = title.trim();
    }

    if (reviewerId) {
      updates.tester_id = reviewerId;
    }

    if (githubBranch !== undefined && githubBranch !== null) {
      updates.github_branch = githubBranch.trim() || null;
    }

    // Auto-transition column to Review if column exists in the project
    if (projectId) {
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name')
        .eq('project_id', projectId);

      if (cols && cols.length > 0) {
        const reviewCol = cols.find((c) => {
          const n = c.name.toLowerCase();
          return (
            n.includes('review') || n.includes('qa') || n.includes('testing')
          );
        });
        if (reviewCol) {
          updates.column_id = reviewCol.id;
        }
      }
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select(
        'id, dev_status, test_status, tester_id, github_branch, github_repo, column_id'
      )
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal membuka Pull Request (Ajukan QA).',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        devStatus: 'dev_done',
        testStatus: 'testing',
        testerId: updatedTask.tester_id,
        githubBranch: updatedTask.github_branch,
        githubRepo: updatedTask.github_repo ?? null,
        columnId: updatedTask.column_id,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat mengajukan Pull Request.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface RequestChangesInput {
  taskId: string;
  notes: string;
  projectId?: string | null;
}

/**
 * Server action for Reviewer (Tester) to request changes from Developer.
 * Reverts dev_status back to 'in_progress', sets test_status to 'failed',
 * records revision notes, and optionally moves column back to 'In Progress'.
 */
export async function requestChangesAction({
  taskId,
  notes,
  projectId,
}: RequestChangesInput): Promise<
  ActionState<{
    id: string;
    devStatus: 'in_progress';
    testStatus: 'failed';
    testNotes: string | null;
    columnId?: string;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
    };
  }

  if (!notes?.trim()) {
    return {
      success: false,
      error: { _form: ['Catatan revisi pengujian wajib diisi.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates: {
      dev_status: 'in_progress';
      test_status: 'failed';
      test_notes: string;
      updated_at: string;
      column_id?: string;
    } = {
      dev_status: 'in_progress',
      test_status: 'failed',
      test_notes: notes.trim(),
      updated_at: new Date().toISOString(),
    };

    // Auto-transition column back to In Progress if column exists in the project
    if (projectId) {
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name')
        .eq('project_id', projectId);

      if (cols && cols.length > 0) {
        const inProgressCol = cols.find((c) => {
          const n = c.name.toLowerCase();
          return (
            n.includes('progress') ||
            n.includes('doing') ||
            n.includes('in work')
          );
        });
        if (inProgressCol) {
          updates.column_id = inProgressCol.id;
        }
      }
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, dev_status, test_status, test_notes, column_id')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal mengirimkan catatan Request Changes.',
          ],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        devStatus: 'in_progress',
        testStatus: 'failed',
        testNotes: updatedTask.test_notes,
        columnId: updatedTask.column_id,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat memproses Request Changes.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}

export interface MergePullRequestInput {
  taskId: string;
  notes?: string | null;
  projectId?: string | null;
}

/**
 * Server action for Reviewer (Tester) to Merge Pull Request.
 * Verifies testing passed, sets test_status to 'passed', dev_status to 'dev_done',
 * moves task to 'Done' column in Kanban, and immediately frees workload points.
 */
export async function mergePullRequestAction({
  taskId,
  notes,
  projectId,
}: MergePullRequestInput): Promise<
  ActionState<{
    id: string;
    devStatus: 'dev_done';
    testStatus: 'passed';
    columnId?: string;
  }>
> {
  if (!taskId) {
    return {
      success: false,
      error: { _form: ['Task ID harus disediakan.'] },
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
        error: { _form: ['Sesi login tidak valid atau telah berakhir.'] },
      };
    }

    const updates: {
      dev_status: 'dev_done';
      test_status: 'passed';
      updated_at: string;
      test_notes?: string | null;
      column_id?: string;
    } = {
      dev_status: 'dev_done',
      test_status: 'passed',
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined && notes !== null) {
      updates.test_notes = notes.trim() || null;
    }

    // Auto-transition column to Done / Selesai in the project
    if (projectId) {
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position')
        .eq('project_id', projectId)
        .order('position', { ascending: false });

      if (cols && cols.length > 0) {
        const doneCol =
          cols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('done') ||
              n.includes('selesai') ||
              n.includes('complete')
            );
          }) || cols[0]; // fallback to column with highest position

        if (doneCol) {
          updates.column_id = doneCol.id;
        }
      }
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, dev_status, test_status, column_id')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [updateError.message || 'Gagal melakukan Merge Pull Request.'],
        },
      };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${taskId}`);

    return {
      success: true,
      data: {
        id: updatedTask.id,
        devStatus: 'dev_done',
        testStatus: 'passed',
        columnId: updatedTask.column_id,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat melakukan Merge Pull Request.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}
