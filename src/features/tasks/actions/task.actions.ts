'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createTaskSchema, type CreateTaskInput } from '../schemas/task.schema';
import type { ActionState } from '@/types/global';

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

    const fieldToUpdate = role === 'developer' ? 'developer_id' : 'tester_id';
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

    // Auto transition to testing when developer finishes work
    if (devStatus === 'dev_done') {
      updates.test_status = 'testing';
    }

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

    const { error: deleteError } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('task_id', taskId);

    if (deleteError) {
      return {
        success: false,
        error: {
          _form: [
            deleteError.message || 'Gagal menghapus subtask dari database.',
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
