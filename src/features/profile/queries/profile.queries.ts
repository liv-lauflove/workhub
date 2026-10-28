import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/features/auth/queries/auth.queries';
import type { UserSettingsData } from '../types/profile.types';

/**
 * Fetches user profile, team information, and GitHub integration status.
 * Wrapped with React cache() to deduplicate in Server Components.
 */
export const getSettingsData = cache(
  async (): Promise<UserSettingsData | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();

    // 1. Fetch profile with joined team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, teams(id, name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // 2. Fetch GitHub integration record if present
    const { data: githubIntegration } = await supabase
      .from('github_integrations')
      .select('id, github_user_id, scope, connected_at')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: {
        ...profile,
        email: user.email,
      },
      githubIntegration: githubIntegration ?? null,
    };
  }
);
