'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createProjectSchema,
  type CreateProjectInput,
} from '../schemas/project.schema';
import type { ActionState } from '@/types/global';

/**
 * Server action to create a new Project.
 * Only team leaders can create projects.
 */
export async function createProject(
  _prevState: ActionState<{ id: string }> | null,
  input: CreateProjectInput | FormData
): Promise<ActionState<{ id: string }>> {
  let rawData: {
    name?: string;
    description?: string;
    milestoneId?: string;
    teamId?: string;
    picId?: string;
    status?: string;
  };

  if (input instanceof FormData) {
    rawData = {
      name: (input.get('name') as string)?.trim(),
      description: (input.get('description') as string)?.trim(),
      milestoneId: (input.get('milestoneId') as string)?.trim(),
      teamId: (input.get('teamId') as string)?.trim(),
      picId: (input.get('picId') as string)?.trim() || undefined,
      status: (input.get('status') as string)?.trim() || 'planned',
    };
  } else {
    rawData = {
      name: input.name?.trim(),
      description: input.description?.trim(),
      milestoneId: input.milestoneId,
      teamId: input.teamId,
      picId: input.picId || undefined,
      status: input.status || 'planned',
    };
  }

  const parsed = createProjectSchema.safeParse(rawData);
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
        _form: ['Hanya Leader yang memiliki izin untuk membuat project.'],
      },
    };
  }

  // Verify milestone exists and is active
  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .select('id, title, archived_at')
    .eq('id', parsed.data.milestoneId)
    .is('archived_at', null)
    .maybeSingle();

  if (milestoneError || !milestone) {
    return {
      success: false,
      error: {
        milestoneId: [
          'Milestone yang dipilih tidak valid atau sudah diarsipkan.',
        ],
      },
    };
  }

  // Verify team exists
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', parsed.data.teamId)
    .maybeSingle();

  if (teamError || !team) {
    return {
      success: false,
      error: {
        teamId: ['Tim yang dipilih tidak valid.'],
      },
    };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      milestone_id: parsed.data.milestoneId,
      team_id: parsed.data.teamId,
      pic_id: parsed.data.picId || null,
      status: parsed.data.status || 'planned',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error inserting project:', error);
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/milestones');
  revalidatePath(`/milestones/${parsed.data.milestoneId}`);
  revalidatePath('/projects');
  revalidatePath('/');

  return {
    success: true,
    data: { id: data.id },
  };
}
