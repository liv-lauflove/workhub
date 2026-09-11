'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createMilestoneSchema,
  type CreateMilestoneInput,
} from '../schemas/milestone.schema';
import type { ActionState } from '@/types/global';

/**
 * Server action to create a new Milestone.
 * Only team leaders can create milestones.
 */
export async function createMilestone(
  _prevState: ActionState<{ id: string }> | null,
  input: CreateMilestoneInput | FormData
): Promise<ActionState<{ id: string }>> {
  let rawData: {
    title?: string;
    description?: string;
    startDate?: string;
    targetDate?: string;
    picId?: string;
  };

  if (input instanceof FormData) {
    rawData = {
      title: (input.get('title') as string)?.trim(),
      description: (input.get('description') as string)?.trim(),
      startDate: (input.get('startDate') as string)?.trim(),
      targetDate: (input.get('targetDate') as string)?.trim(),
      picId: (input.get('picId') as string)?.trim() || undefined,
    };
  } else {
    rawData = {
      title: input.title?.trim(),
      description: input.description?.trim(),
      startDate: input.startDate,
      targetDate: input.targetDate,
      picId: input.picId || undefined,
    };
  }

  const parsed = createMilestoneSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { _form: ['Sesi Anda tidak valid. Silakan login kembali.'] },
    };
  }

  // Verify leader role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'leader') {
    return {
      success: false,
      error: {
        _form: ['Hanya Leader yang memiliki izin untuk membuat milestone.'],
      },
    };
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      start_date: parsed.data.startDate,
      target_date: parsed.data.targetDate,
      pic_id: parsed.data.picId || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error inserting milestone:', error);
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/milestones');
  revalidatePath('/');

  return {
    success: true,
    data: { id: data.id },
  };
}
