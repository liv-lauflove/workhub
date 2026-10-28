'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/types/global';
import type { UpdateTaskColumnInput } from '../types/kanban.types';

/**
 * Server action to update a task's column when moved across Kanban board.
 * Enforces user authentication and Supabase Row Level Security.
 */
export async function updateTaskColumnAction({
  taskId,
  targetColumnId,
  projectId,
}: UpdateTaskColumnInput): Promise<
  ActionState<{ id: string; columnId: string }>
> {
  if (!taskId || !targetColumnId) {
    return {
      success: false,
      error: { _form: ['Task ID dan target Column ID harus disediakan.'] },
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

    // Update column_id on the task in Supabase
    const { data, error: updateError } = await supabase
      .from('tasks')
      .update({
        column_id: targetColumnId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('id, column_id')
      .single();

    if (updateError) {
      return {
        success: false,
        error: {
          _form: [
            updateError.message || 'Gagal memperbarui status task di database.',
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
        id: data.id,
        columnId: data.column_id,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan sistem saat sinkronisasi task ke database.';
    return {
      success: false,
      error: { _form: [message] },
    };
  }
}
