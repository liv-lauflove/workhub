import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { oauthExchangeFetch } from '@/features/profile/github-oauth';
import { createAdminClient } from '@/lib/supabase/admin';
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
    let providerToken = '';
    const supabase = await createClient(
      oauthExchangeFetch((token) => {
        providerToken = token;
      })
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = new URL(next, requestUrl.origin);
      const identity = data.user?.identities?.find(
        (i) => i.provider === 'github'
      );
      let saved = false;
      // Other providers can be linked to the same account. Only send GitHub OAuth
      // credentials to GitHub, and match the token owner before writing any metadata.
      if (data.user && identity && providerToken.startsWith('gho_')) {
        try {
          const res = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${providerToken}`,
              Accept: 'application/vnd.github+json',
            },
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const account = await res.json();
            if (
              typeof account.login === 'string' &&
              account.id != null &&
              String(account.id) === identity.id
            ) {
              const { error: storageError } = await createAdminClient().rpc(
                'save_github_connection',
                {
                  p_user_id: data.user.id,
                  p_username: account.login,
                  p_github_id: identity.id,
                  p_token: providerToken,
                  p_scope: res.headers.get('x-oauth-scopes') ?? '',
                }
              );
              saved = !storageError;
            }
          }
        } catch {
          // The login session is valid even if syncing the GitHub integration fails.
        }
      }
      if (
        next.startsWith('/settings') ||
        (identity && providerToken.startsWith('gho_') && !saved)
      ) {
        if (!saved)
          return NextResponse.redirect(
            new URL('/settings?error=github_sync_failed', requestUrl.origin)
          );
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
