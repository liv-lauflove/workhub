import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

function source(file, dependencies) {
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exp = {};
  new Function('exports', 'require', js)(exp, (id) => {
    assert.ok(Object.hasOwn(dependencies, id), 'Unmocked import ' + id);
    return dependencies[id];
  });
  return exp;
}

const url = 'https://fixture.supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
const helper = source('src/features/profile/github-oauth.ts', {
  'server-only': {},
});
const identity = {
  provider: 'github',
  id: '15201',
  identity_data: { sub: '15201' },
};
const user = {
  id: 'test-user',
  identities: [identity],
  email: 'test@example.invalid',
};
let githubId = 15201;
let token = 'gho_dummy152';
const refresh = 'dummy-provider-refresh';
const originalFetch = globalThis.fetch;
let authFailure = false,
  failSave = false,
  unlinkFailure = false,
  failCleanup = false;
let identityLinked = true,
  requests = [],
  cookies = new Map();
const authClient = () =>
  createServerClient(url, 'dummy-key', {
    global: { fetch: currentFetch },
    cookies: {
      getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) {
          if (value) cookies.set(name, value);
          else cookies.delete(name);
        }
      },
    },
  });
let currentFetch;
const admin = {
  rpc: async (rpc, args) => {
    requests.push([rpc, args]);
    return {
      error:
        (rpc === 'save_github_connection' && failSave) ||
        (rpc === 'clear_github_connection' && failCleanup)
          ? { message: 'simulated' }
          : null,
    };
  },
};
globalThis.fetch = async (input, init) => {
  const target = input instanceof Request ? input.url : String(input);
  if (target === 'https://api.github.com/user') {
    assert.equal(init.headers.Authorization, 'Bearer ' + token);
    assert.equal(init.redirect, 'error');
    return Response.json(
      { id: githubId, login: 'fixture' },
      { headers: { 'x-oauth-scopes': 'read:user' } }
    );
  }
  assert.equal(new URL(target).origin, url);
  if (authFailure)
    return Response.json({ error: 'Invalid code' }, { status: 400 });
  return Response.json({
    access_token: 'supabase-session-only',
    refresh_token: 'supabase-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    provider_token: token,
    provider_refresh_token: refresh,
    user,
  });
};
try {
  const { GET } = source('src/app/(auth)/auth/callback/route.ts', {
    'next/server': { NextResponse: Response },
    '@/features/profile/github-oauth': helper,
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/supabase/server': {
      createClient: async (f) => {
        currentFetch = f;
        return authClient();
      },
    },
  });
  async function callback(next = '/settings') {
    cookies = new Map([
      ['sb-fixture-auth-token-code-verifier', JSON.stringify('dummy-verifier')],
    ]);
    requests = [];
    const result = await GET(
      new Request(
        'https://workhub.test/auth/callback?code=fixture&next=' +
          encodeURIComponent(next)
      )
    );
    assert.ok(!result.headers.get('location').includes('dummy'));
    return new URL(result.headers.get('location'));
  }
  assert.equal((await callback()).searchParams.get('github_linked'), 'true');
  assert.deepEqual(requests, [
    [
      'save_github_connection',
      {
        p_user_id: user.id,
        p_username: 'fixture',
        p_github_id: '15201',
        p_token: token,
        p_scope: 'read:user',
      },
    ],
  ]);
  const encoded = cookies.get('sb-fixture-auth-token');
  assert.ok(encoded?.startsWith('base64-'));
  const session = JSON.parse(Buffer.from(encoded.slice(7), 'base64url'));
  assert.equal(session.access_token, 'supabase-session-only');
  assert.equal(session.refresh_token, 'supabase-refresh');
  assert.ok(
    !('provider_token' in session) && !('provider_refresh_token' in session)
  );

  githubId = 15202;
  assert.equal(
    (await callback()).searchParams.get('error'),
    'github_sync_failed'
  );
  assert.equal(requests.length, 0);
  githubId = 15201;
  failSave = true;
  assert.equal(
    (await callback()).searchParams.get('error'),
    'github_sync_failed'
  );
  failSave = false;
  token = 'other-provider-dummy';
  assert.equal((await callback('/')).pathname, '/');
  assert.equal(requests.length, 0);
  authFailure = true;
  assert.equal((await callback()).searchParams.get('error'), 'oauth_failed');

  const { unlinkGitHubAction, linkGitHubManualAction } = source(
    'src/features/profile/actions/profile.actions.ts',
    {
      '@/lib/supabase/server': {
        createClient: async () => ({
          auth: {
            getUser: async () => ({
              data: {
                user: { ...user, identities: identityLinked ? [identity] : [] },
              },
            }),
            unlinkIdentity: async () => {
              if (unlinkFailure)
                return { error: { code: 'single_identity_not_deletable' } };
              identityLinked = false;
              return { error: null };
            },
          },
        }),
      },
      '@/lib/supabase/admin': { createAdminClient: () => admin },
      '../types/profile.types': source(
        'src/features/profile/types/profile.types.ts',
        { zod: { z } }
      ),
      'next/cache': { revalidatePath() {} },
    }
  );
  requests = [];
  unlinkFailure = true;
  assert.equal((await unlinkGitHubAction()).success, false);
  assert.equal(requests.length, 0);
  unlinkFailure = false;
  failCleanup = true;
  assert.equal((await unlinkGitHubAction()).success, false);
  assert.equal(identityLinked, false);
  failCleanup = false;
  assert.equal((await unlinkGitHubAction()).success, true);
  assert.equal((await unlinkGitHubAction()).success, true);
  assert.deepEqual(
    requests,
    Array.from({ length: 3 }, () => [
      'clear_github_connection',
      { p_user_id: user.id },
    ])
  );
  const form = new FormData();
  form.set('username', 'example');
  assert.equal((await linkGitHubManualAction(form)).success, true);
  assert.deepEqual(requests.at(-1), [
    'save_github_connection',
    { p_user_id: user.id, p_username: 'example' },
  ]);
  failSave = true;
  assert.equal((await linkGitHubManualAction(form)).success, false);
  console.log(
    'GitHub OAuth, actual SSR session cookies, manual linking, unlink failures and retries passed.'
  );
} finally {
  globalThis.fetch = originalFetch;
}
