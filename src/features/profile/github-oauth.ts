import 'server-only';

// GoTrue persists the PKCE response as the SSR session. Extract provider credentials
// before it serializes the session, including when the subsequent profile sync fails.
export function oauthExchangeFetch(
  capture: (token: string) => void
): typeof fetch {
  const endpoint = new URL(
    '/auth/v1/token',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  return async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString()
    );
    const res = await fetch(input, init);
    if (
      !res.ok ||
      url.origin !== endpoint.origin ||
      url.pathname !== endpoint.pathname ||
      url.searchParams.get('grant_type') !== 'pkce'
    )
      return res;

    const session = await res.json();
    if (typeof session.provider_token === 'string')
      capture(session.provider_token);
    delete session.provider_token;
    delete session.provider_refresh_token;
    return Response.json(session, { status: res.status });
  };
}
