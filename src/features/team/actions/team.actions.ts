'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
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

  if (profile.team_id !== parsed.data.teamId) {
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

  // Check if email is already invited (pending)
  const { data: existing, error: checkError } = await admin
    .from('team_invitations')
    .select('id')
    .eq('team_id', parsed.data.teamId)
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

  // Insert into team_invitations table using admin client
  const { data: insertedData, error: insertError } = await admin
    .from('team_invitations')
    .insert({
      team_id: parsed.data.teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: profile.id,
      token,
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
    '✅ [inviteTeamMember] Successfully inserted into DB:',
    insertedData
  );

  // Invite user via Supabase Auth Admin API (sends email magic link via service role)
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/team`,
        data: {
          full_name: parsed.data.email.split('@')[0],
          invited_team_id: parsed.data.teamId,
          invited_role: parsed.data.role,
        },
      }
    );

    if (inviteError) {
      console.warn(
        '⚠️ [inviteTeamMember] Auth invite email warning (non-blocking):',
        inviteError.message
      );
    } else {
      console.log(
        '📧 [inviteTeamMember] Supabase Auth invite email sent successfully!'
      );
    }
  } catch (err) {
    console.warn('⚠️ [inviteTeamMember] Failed to call admin invite API:', err);
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
