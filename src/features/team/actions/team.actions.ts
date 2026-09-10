'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import type { ActionState } from '@/types/global';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['leader', 'member'], {
    message: 'Role harus dipilih',
  }),
  teamId: z.string().uuid('Team ID tidak valid'),
});

/**
 * Invite a new member to a team.
 * Only leaders of the team can perform this action.
 */
export async function inviteTeamMember(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email'),
    role: formData.get('role'),
    teamId: formData.get('teamId'),
  };

  const parsed = inviteSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  // Verify the current user is a leader of this team
  const profile = await getUserProfile();
  if (
    !profile ||
    profile.role !== 'leader' ||
    profile.team_id !== parsed.data.teamId
  ) {
    return {
      success: false,
      error: {
        _form: ['Hanya leader tim yang dapat mengundang anggota baru.'],
      },
    };
  }

  const supabase = await createClient();

  // Check if email is already invited (pending)
  const { data: existing } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', parsed.data.teamId)
    .eq('email', parsed.data.email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: { email: ['Email ini sudah memiliki undangan yang pending.'] },
    };
  }

  // Generate a unique invitation token
  const token = crypto.randomUUID();

  // Insert into team_invitations
  const { error: insertError } = await supabase
    .from('team_invitations')
    .insert({
      team_id: parsed.data.teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: profile.id,
      token,
    });

  if (insertError) {
    return {
      success: false,
      error: { _form: [insertError.message] },
    };
  }

  // Invite user via Supabase Auth (sends magic link email)
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        full_name: parsed.data.email.split('@')[0],
        invited_team_id: parsed.data.teamId,
        invited_role: parsed.data.role,
      },
    }
  );

  // If invite fails (e.g. no admin/service_role key), we still have the record.
  // The leader can share the registration link manually.
  if (inviteError) {
    console.warn(
      'Auth invite email failed (expected without service_role key):',
      inviteError.message
    );
  }

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
  if (!profile || profile.role !== 'leader' || profile.team_id !== teamId) {
    return {
      success: false,
      error: { _form: ['Hanya leader tim yang dapat membatalkan undangan.'] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
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
