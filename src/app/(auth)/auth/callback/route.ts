import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler for Supabase Auth.
 * Exchanges the auth code for a session and redirects to destination.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync GitHub profile data if OAuth exchange includes GitHub identity
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const githubIdentity = user.identities?.find(
            (i) => i.provider === 'github'
          );
          const identityData = githubIdentity?.identity_data as
            | {
                user_name?: string;
                preferred_username?: string;
                avatar_url?: string;
                sub?: string;
              }
            | undefined;

          const githubUsername =
            identityData?.user_name ||
            identityData?.preferred_username ||
            (user.user_metadata?.user_name as string | undefined) ||
            (user.user_metadata?.preferred_username as string | undefined) ||
            null;

          const githubUserId =
            identityData?.sub ||
            githubIdentity?.id ||
            (user.user_metadata?.sub as string | undefined) ||
            null;

          if (githubUsername) {
            await supabase
              .from('profiles')
              .update({
                github_username: githubUsername,
              })
              .eq('id', user.id);
          }

          if (githubUserId) {
            await supabase.from('github_integrations').upsert(
              {
                user_id: user.id,
                github_user_id: String(githubUserId),
                access_token:
                  sessionData?.session?.provider_token || 'oauth_linked',
                scope: 'read:user,user:email,repo',
                connected_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          }
        }
      } catch (syncErr) {
        console.warn('OAuth callback GitHub profile sync warning:', syncErr);
      }

      const redirectUrl = new URL(next, requestUrl.origin);
      if (next.startsWith('/settings')) {
        redirectUrl.searchParams.set('github_linked', 'true');
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect with error parameter if exchange fails
  const errorRedirect = next.startsWith('/settings')
    ? '/settings?error=oauth_failed'
    : '/login?error=oauth_failed';
  return NextResponse.redirect(new URL(errorRedirect, requestUrl.origin));
}
