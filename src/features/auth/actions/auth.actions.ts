'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ROUTES } from '@/config/routes';
import { loginSchema, registerSchema } from '../types/auth.types';
import type { ActionState } from '@/types/global';

/**
 * Sign in using email and password.
 */
export async function login(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  // Claim pending invitation if user has no team assigned yet
  if (authData?.user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', authData.user.id)
        .single();

      if (profile && !profile.team_id && authData.user.email) {
        const admin = createAdminClient();
        const { data: invitation } = await admin
          .from('team_invitations')
          .select('id, team_id, role')
          .eq('email', authData.user.email)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invitation) {
          await admin
            .from('profiles')
            .update({
              team_id: invitation.team_id,
              role: invitation.role || 'member',
            })
            .eq('id', authData.user.id);

          await admin
            .from('team_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);
        }
      }
    } catch (claimErr) {
      console.warn('⚠️ [login] Error auto-claiming invitation:', claimErr);
    }
  }

  revalidatePath('/', 'layout');
  redirect(ROUTES.dashboard);
}

/**
 * Sign up a new user using email and password.
 */
export async function register(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: { _form: [error.message] },
    };
  }

  revalidatePath('/', 'layout');
  redirect(ROUTES.dashboard);
}

/**
 * Sign out the current user and redirect to login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(ROUTES.login);
}
