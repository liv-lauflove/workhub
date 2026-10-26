'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { isManagementTeam, MANAGEMENT_TEAM_ID } from '../queries/team.queries';
import type { ActionState } from '@/types/global';
import { z } from 'zod';

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const inviteSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['leader', 'member'], {
    message: 'Role harus dipilih',
  }),
  teamId: z.string().regex(uuidRegex, 'Team ID tidak valid'),
});

export type InviteTeamMemberInput = {
  email: string;
  role: 'leader' | 'member';
  teamId: string;
};

const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama tim minimal 2 karakter')
    .max(50, 'Nama tim maksimal 50 karakter'),
});

const updateTeamSchema = z.object({
  teamId: z.string().regex(uuidRegex, 'Team ID tidak valid'),
  name: z
    .string()
    .trim()
    .min(2, 'Nama tim minimal 2 karakter')
    .max(50, 'Nama tim maksimal 50 karakter'),
});

export type CreateTeamInput = {
  name: string;
};

export type UpdateTeamInput = {
  teamId: string;
  name: string;
};

/**
 * Create a new squad / team.
 * Only members of the Management team are authorized to create teams.
 */
export async function createTeamAction(
  input: CreateTeamInput | FormData
): Promise<ActionState> {
  let rawData: { name?: string };

  if (input instanceof FormData) {
    rawData = {
      name: (input.get('name') as string)?.trim(),
    };
  } else {
    rawData = {
      name: input.name?.trim(),
    };
  }

  const parsed = createTeamSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const profile = await getUserProfile();
  if (!profile) {
    return {
      success: false,
      error: { _form: ['Sesi Anda tidak valid. Silakan login kembali.'] },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement) {
    return {
      success: false,
      error: {
        _form: [
          'Hanya role Management yang memiliki izin untuk membuat tim baru.',
        ],
      },
    };
  }

  const teamName = parsed.data.name;

  if (teamName.toLowerCase() === 'management') {
    return {
      success: false,
      error: {
        name: ['Nama tim "Management" sudah digunakan oleh tim sistem.'],
      },
    };
  }

  const admin = createAdminClient();

  // Check duplicate team name (case-insensitive)
  const { data: existingTeam, error: checkError } = await admin
    .from('teams')
    .select('id, name')
    .ilike('name', teamName)
    .maybeSingle();

  if (checkError) {
    console.error('❌ [createTeamAction] Check error:', checkError);
  }

  if (existingTeam) {
    return {
      success: false,
      error: { name: [`Tim dengan nama "${existingTeam.name}" sudah ada.`] },
    };
  }

  const { error: insertError } = await admin
    .from('teams')
    .insert({ name: teamName });

  if (insertError) {
    console.error('❌ [createTeamAction] Insert DB error:', insertError);
    return {
      success: false,
      error: { _form: [insertError.message] },
    };
  }

  revalidatePath('/team');
  revalidatePath('/projects');
  return { success: true };
}

/**
 * Update an existing team's name.
 * Only members of the Management team are authorized to edit teams.
 * The default 'Management' system team cannot be modified.
 */
export async function updateTeamAction(
  input: UpdateTeamInput | FormData
): Promise<ActionState> {
  let rawData: { teamId?: string; name?: string };

  if (input instanceof FormData) {
    rawData = {
      teamId: (input.get('teamId') as string)?.trim(),
      name: (input.get('name') as string)?.trim(),
    };
  } else {
    rawData = {
      teamId: input.teamId?.trim(),
      name: input.name?.trim(),
    };
  }

  const parsed = updateTeamSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const profile = await getUserProfile();
  if (!profile) {
    return {
      success: false,
      error: { _form: ['Sesi Anda tidak valid. Silakan login kembali.'] },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement) {
    return {
      success: false,
      error: {
        _form: [
          'Hanya role Management yang memiliki izin untuk mengubah data tim.',
        ],
      },
    };
  }

  const { teamId: targetId, name: newName } = parsed.data;

  // Protect Management system team by ID or name
  if (
    targetId === MANAGEMENT_TEAM_ID ||
    newName.toLowerCase() === 'management'
  ) {
    return {
      success: false,
      error: {
        _form: [
          "Tim 'Management' merupakan tim sistem bawaan dan tidak dapat diubah namanya.",
        ],
      },
    };
  }

  const admin = createAdminClient();

  // Fetch target team to verify existence and check its current name
  const { data: targetTeam, error: fetchError } = await admin
    .from('teams')
    .select('id, name')
    .eq('id', targetId)
    .maybeSingle();

  if (fetchError || !targetTeam) {
    return {
      success: false,
      error: { _form: ['Tim tidak ditemukan.'] },
    };
  }

  if (targetTeam.name.toLowerCase() === 'management') {
    return {
      success: false,
      error: {
        _form: [
          "Tim 'Management' merupakan tim sistem bawaan dan tidak dapat diubah namanya.",
        ],
      },
    };
  }

  // Check duplicate name against other teams
  const { data: existingTeam } = await admin
    .from('teams')
    .select('id, name')
    .ilike('name', newName)
    .neq('id', targetId)
    .maybeSingle();

  if (existingTeam) {
    return {
      success: false,
      error: { name: [`Tim dengan nama "${existingTeam.name}" sudah ada.`] },
    };
  }

  const { error: updateError } = await admin
    .from('teams')
    .update({ name: newName })
    .eq('id', targetId);

  if (updateError) {
    console.error('❌ [updateTeamAction] Update DB error:', updateError);
    return {
      success: false,
      error: { _form: [updateError.message] },
    };
  }

  revalidatePath('/team');
  revalidatePath('/projects');
  return { success: true };
}

/**
 * Invite a new member to a team.
 * Only leaders of the team can perform this action.
 */
export async function inviteTeamMember(
  input: InviteTeamMemberInput | FormData
): Promise<ActionState> {
  let rawData: { email?: string; role?: string; teamId?: string };

  if (input instanceof FormData) {
    rawData = {
      email: (input.get('email') as string)?.trim(),
      role: (input.get('role') as string)?.trim(),
      teamId: (input.get('teamId') as string)?.trim(),
    };
  } else {
    rawData = {
      email: input.email?.trim(),
      role: input.role,
      teamId: input.teamId?.trim(),
    };
  }

  console.log('🔥 [inviteTeamMember] Action received:', rawData);

  const parsed = inviteSchema.safeParse(rawData);
  if (!parsed.success) {
    console.warn(
      '❌ [inviteTeamMember] Validation failed:',
      parsed.error.flatten().fieldErrors
    );
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  // Verify the current user is a leader of this team
  const profile = await getUserProfile();
  console.log('👤 [inviteTeamMember] Current user profile:', profile);

  if (!profile) {
    console.error('❌ [inviteTeamMember] No profile found for current user');
    return {
      success: false,
      error: { _form: ['Sesi Anda tidak valid. Silakan login kembali.'] },
    };
  }

  if (profile.role !== 'leader') {
    console.error(
      '❌ [inviteTeamMember] User is not a leader. Role:',
      profile.role
    );
    return {
      success: false,
      error: {
        _form: ['Hanya leader tim yang dapat mengundang anggota baru.'],
      },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement && profile.team_id !== parsed.data.teamId) {
    console.error(
      '❌ [inviteTeamMember] Team mismatch:',
      profile.team_id,
      'vs',
      parsed.data.teamId
    );
    return {
      success: false,
      error: { _form: ['Anda tidak memiliki akses ke tim ini.'] },
    };
  }

  const admin = createAdminClient();

  // Check if email already has a pending invitation
  const { data: existing, error: checkError } = await admin
    .from('team_invitations')
    .select('id')
    .eq('email', parsed.data.email)
    .eq('status', 'pending')
    .maybeSingle();

  if (checkError) {
    console.error('❌ [inviteTeamMember] Check existing error:', checkError);
  }

  if (existing) {
    console.warn('⚠️ [inviteTeamMember] Email already has pending invitation');
    return {
      success: false,
      error: { email: ['Email ini sudah memiliki undangan yang pending.'] },
    };
  }

  // Generate a unique invitation token
  const token = crypto.randomUUID();

  // Insert into team_invitations table using admin client with pending status
  const { data: insertedData, error: insertError } = await admin
    .from('team_invitations')
    .insert({
      team_id: parsed.data.teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: profile.id,
      token,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ [inviteTeamMember] Insert DB error:', insertError);
    return {
      success: false,
      error: { _form: [insertError.message] },
    };
  }

  console.log(
    '✅ [inviteTeamMember] Successfully created pending invitation:',
    insertedData
  );

  revalidatePath('/team');
  return { success: true };
}

/**
 * Revoke a pending invitation.
 * Only leaders of the team can perform this action.
 */
export async function revokeInvitation(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const invitationId = formData.get('invitationId') as string;
  const teamId = formData.get('teamId') as string;

  if (!invitationId || !teamId) {
    return {
      success: false,
      error: { _form: ['Data tidak lengkap.'] },
    };
  }

  const profile = await getUserProfile();
  if (!profile || profile.role !== 'leader') {
    return {
      success: false,
      error: { _form: ['Hanya leader tim yang dapat membatalkan undangan.'] },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement && profile.team_id !== teamId) {
    return {
      success: false,
      error: {
        _form: ['Anda tidak memiliki izin untuk membatalkan undangan tim ini.'],
      },
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('team_id', teamId)
    .eq('status', 'pending');

  if (error) {
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/team');
  return { success: true };
}

/**
 * Update a team member's role.
 * Only leaders of the team can perform this action.
 */
export async function updateMemberRole(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as 'leader' | 'member';
  const teamId = formData.get('teamId') as string;

  if (!userId || !newRole || !teamId) {
    return {
      success: false,
      error: { _form: ['Data tidak lengkap.'] },
    };
  }

  const profile = await getUserProfile();
  if (!profile || profile.role !== 'leader') {
    return {
      success: false,
      error: { _form: ['Hanya leader tim yang dapat mengubah role anggota.'] },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement && profile.team_id !== teamId) {
    return {
      success: false,
      error: { _form: ['Anda tidak memiliki akses ke tim ini.'] },
    };
  }

  // Prevent leader from demoting themselves if they are the only leader
  if (profile.id === userId && newRole === 'member') {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('role', 'leader');

    if (count && count <= 1) {
      return {
        success: false,
        error: {
          _form: [
            'Anda adalah leader terakhir. Promosikan anggota lain sebelum turun jabatan.',
          ],
        },
      };
    }
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('team_id', teamId);

  if (error) {
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/team');
  return { success: true };
}

/**
 * Update a team member's workload capacity points.
 * Only leaders of the team can perform this action.
 */
export async function updateMemberCapacity(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const userId = formData.get('userId') as string;
  const teamId = formData.get('teamId') as string;
  const rawPoints = formData.get('capacityPoints') as string;
  const capacityPoints = parseInt(rawPoints, 10);

  if (!userId || !teamId || isNaN(capacityPoints)) {
    return {
      success: false,
      error: { _form: ['Data tidak lengkap atau format poin tidak valid.'] },
    };
  }

  if (capacityPoints < 10 || capacityPoints > 1000) {
    return {
      success: false,
      error: {
        capacityPoints: [
          'Kapasitas poin harus berada di antara 10 hingga 1000 poin.',
        ],
      },
    };
  }

  const profile = await getUserProfile();
  if (!profile || profile.role !== 'leader') {
    return {
      success: false,
      error: {
        _form: [
          'Hanya leader tim yang memiliki wewenang mengatur kapasitas poin anggota.',
        ],
      },
    };
  }

  const isManagement = await isManagementTeam(profile.team_id);
  if (!isManagement && profile.team_id !== teamId) {
    return {
      success: false,
      error: {
        _form: ['Anda tidak memiliki akses ke tim ini.'],
      },
    };
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ capacity_points: capacityPoints })
    .eq('id', userId)
    .eq('team_id', teamId);

  if (error) {
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/team');
  revalidatePath('/workload');
  return { success: true };
}
