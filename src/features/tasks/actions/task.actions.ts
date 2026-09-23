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
