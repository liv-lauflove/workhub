import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const requireProject = createRequire(path.join(root, 'package.json'));
const ts = requireProject('typescript');

function loadSource(relative, dependencies = {}) {
  const file = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const sourceModule = { exports: {} };
  const requireSource = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === 'zod') return requireProject(name);
    if (name.startsWith('node:')) return createRequire(import.meta.url)(name);
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), name);
      const targetTs = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies);
      }
    }
    if (name.startsWith('@/')) {
      const target = path.join(root, name.replace(/^@\//, 'src/'));
      const targetTs = target.endsWith('.ts') ? target : `${target}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies);
      }
    }
    throw new Error(`Unexpected dependency in test (${relative}): ${name}`);
  };
  new Function('require', 'module', 'exports', output)(
    requireSource,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}

const MANAGEMENT_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const teamA = 'b1480000-0000-4000-8000-000000000001';
const teamB = 'b1480000-0000-4000-8000-000000000002';
const leaderId = 'a1480000-0000-4000-8000-000000000001';

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

let checks = 0;

// =============================================================================
// TEST SUITE 1: inviteTeamMember Action (Email Normalization & Expired Invites)
// =============================================================================

function createTeamActionsFixture(actor, dbState = { invitations: [] }) {
  const revalidated = [];
  const dbCalls = [];

  const adminClient = {
    from(tableName) {
      if (tableName !== 'team_invitations') {
        throw new Error(`Unexpected admin table access: ${tableName}`);
      }
      return {
        select(fields) {
          const query = {
            table: tableName,
            fields,
            filters: {},
            updates: null,
          };
          const builder = {
            ilike(col, val) {
              query.filters[col] = { op: 'ilike', val };
              return builder;
            },
            eq(col, val) {
              query.filters[col] = { op: 'eq', val };
              return builder;
            },
            then(resolve) {
              dbCalls.push({ type: 'select', ...query });
              // Filter dbState.invitations
              const matched = dbState.invitations.filter((row) => {
                for (const [col, condition] of Object.entries(query.filters)) {
                  if (condition.op === 'ilike') {
                    if (
                      !row[col] ||
                      row[col].toLowerCase() !== condition.val.toLowerCase()
                    ) {
                      return false;
                    }
                  } else if (condition.op === 'eq') {
                    if (row[col] !== condition.val) {
                      return false;
                    }
                  }
                }
                return true;
              });
              resolve({ data: matched, error: null });
            },
          };
          return builder;
        },
        update(values) {
          const query = { table: tableName, values, filters: {} };
          const builder = {
            eq(col, val) {
              query.filters[col] = val;
              return builder;
            },
            then(resolve) {
              dbCalls.push({ type: 'update', ...query });
              for (const row of dbState.invitations) {
                let match = true;
                for (const [col, val] of Object.entries(query.filters)) {
                  if (row[col] !== val) match = false;
                }
                if (match) {
                  Object.assign(row, values);
                }
              }
              resolve({ data: null, error: null });
            },
          };
          return builder;
        },
        insert(record) {
          const query = { table: tableName, record };
          return {
            select() {
              return {
                single: async () => {
                  dbCalls.push({ type: 'insert', ...query });
                  const inserted = { id: 'new-invite-id', ...record };
                  dbState.invitations.push(inserted);
                  return { data: inserted, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const server = {
    createClient: async () => ({
      rpc: async () => ({ data: null, error: null }),
    }),
  };

  const queries = {
    isManagementTeam: async (teamId) => teamId === MANAGEMENT_TEAM_ID,
    MANAGEMENT_TEAM_ID,
  };

  const actions = loadSource('src/features/team/actions/team.actions.ts', {
    '@/lib/supabase/server': server,
    '@/lib/supabase/admin': {
      createAdminClient: () => adminClient,
    },
    '@/features/auth/queries/auth.queries': {
      getUserProfile: async () => actor,
    },
    '../queries/team.queries': queries,
    'next/cache': { revalidatePath: (route) => revalidated.push(route) },
  });

  return { actions, dbCalls, dbState, revalidated };
}

const leaderProfile = {
  id: leaderId,
  role: 'leader',
  team_id: teamA,
};

// Test 1.1: Email normalization on insert (trims and converts to lowercase)
{
  const fixture = createTeamActionsFixture(leaderProfile, { invitations: [] });
  const result = await fixture.actions.inviteTeamMember(
    form({
      email: '   Alice.Engineer@Example.COM   ',
      role: 'member',
      teamId: teamA,
    })
  );

  assert.equal(result.success, true);
  const insertCall = fixture.dbCalls.find((c) => c.type === 'insert');
  assert.ok(insertCall, 'Must perform an insert call');
  assert.equal(
    insertCall.record.email,
    'alice.engineer@example.com',
    'Inserted email must be normalized to lowercase and trimmed'
  );
  assert.equal(insertCall.record.status, 'pending');
  assert.equal(insertCall.record.team_id, teamA);
  assert.deepEqual(fixture.revalidated, ['/team']);
  checks++;
}

// Test 1.2: Active pending invitation blocks re-inviting
{
  const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
  const fixture = createTeamActionsFixture(leaderProfile, {
    invitations: [
      {
        id: 'inv-active-1',
        email: 'alice.engineer@example.com',
        status: 'pending',
        expires_at: futureDate,
      },
    ],
  });

  const result = await fixture.actions.inviteTeamMember(
    form({
      email: 'alice.engineer@example.com',
      role: 'member',
      teamId: teamA,
    })
  );

  assert.equal(result.success, false);
  assert.ok(result.error?.email);
  assert.match(result.error.email[0], /sudah memiliki undangan yang pending/i);
  const insertCall = fixture.dbCalls.find((c) => c.type === 'insert');
  assert.equal(insertCall, undefined, 'Must NOT insert when active invitation exists');
  checks++;
}

// Test 1.3: Active pending check is case-insensitive
{
  const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
  const fixture = createTeamActionsFixture(leaderProfile, {
    invitations: [
      {
        id: 'inv-active-2',
        email: 'bob.developer@example.com',
        status: 'pending',
        expires_at: futureDate,
      },
    ],
  });

  const result = await fixture.actions.inviteTeamMember(
    form({
      email: '  BOB.DEVELOPER@EXAMPLE.COM  ',
      role: 'member',
      teamId: teamA,
    })
  );

  assert.equal(result.success, false);
  assert.ok(result.error?.email);
  const insertCall = fixture.dbCalls.find((c) => c.type === 'insert');
  assert.equal(insertCall, undefined, 'Must NOT insert when case-insensitive active invitation exists');
  checks++;
}

// Test 1.4: Expired pending invitation is marked 'expired' and new invitation IS sent
{
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const fixture = createTeamActionsFixture(leaderProfile, {
    invitations: [
      {
        id: 'inv-expired-1',
        email: 'carol.tester@example.com',
        status: 'pending',
        expires_at: pastDate,
      },
    ],
  });

  const result = await fixture.actions.inviteTeamMember(
    form({
      email: 'CAROL.TESTER@EXAMPLE.COM',
      role: 'member',
      teamId: teamA,
    })
  );

  assert.equal(result.success, true);
  // Must update old invitation status to 'expired'
  const updateCall = fixture.dbCalls.find((c) => c.type === 'update');
  assert.ok(updateCall, 'Must update expired invitation');
  assert.equal(updateCall.values.status, 'expired');
  assert.equal(updateCall.filters.id, 'inv-expired-1');

  // Must insert new pending invitation with normalized email
  const insertCall = fixture.dbCalls.find((c) => c.type === 'insert');
  assert.ok(insertCall, 'Must insert fresh invitation');
  assert.equal(insertCall.record.email, 'carol.tester@example.com');
  assert.equal(insertCall.record.status, 'pending');
  checks++;
}

// Test 1.5: Multiple expired invitations are all marked expired before creating new one
{
  const pastDate1 = new Date(Date.now() - 7200000).toISOString();
  const pastDate2 = new Date(Date.now() - 3600000).toISOString();
  const fixture = createTeamActionsFixture(leaderProfile, {
    invitations: [
      {
        id: 'inv-expired-a',
        email: 'dan@example.com',
        status: 'pending',
        expires_at: pastDate1,
      },
      {
        id: 'inv-expired-b',
        email: 'dan@example.com',
        status: 'pending',
        expires_at: pastDate2,
      },
    ],
  });

  const result = await fixture.actions.inviteTeamMember({
    email: 'dan@example.com',
    role: 'member',
    teamId: teamA,
  });

  assert.equal(result.success, true);
  const updates = fixture.dbCalls.filter((c) => c.type === 'update');
  assert.equal(updates.length, 2, 'Must expire both old invitations');
  const insertCall = fixture.dbCalls.find((c) => c.type === 'insert');
  assert.ok(insertCall, 'Must insert new invitation after expiring stale ones');
  checks++;
}

// Test 1.6: Authorization guards: non-leader cannot invite
{
  const memberProfile = { ...leaderProfile, role: 'member' };
  const fixture = createTeamActionsFixture(memberProfile, { invitations: [] });
  const result = await fixture.actions.inviteTeamMember(
    form({
      email: 'someone@example.com',
      role: 'member',
      teamId: teamA,
    })
  );

  assert.equal(result.success, false);
  assert.match(result.error?._form?.[0], /hanya leader/i);
  assert.equal(fixture.dbCalls.length, 0);
  checks++;
}

// Test 1.7: Authorization guards: leader cannot invite to a different team
{
  const fixture = createTeamActionsFixture(leaderProfile, { invitations: [] });
  const result = await fixture.actions.inviteTeamMember(
    form({
      email: 'someone@example.com',
      role: 'member',
      teamId: teamB,
    })
  );

  assert.equal(result.success, false);
  assert.match(result.error?._form?.[0], /tidak memiliki akses/i);
  assert.equal(fixture.dbCalls.length, 0);
  checks++;
}

// =============================================================================
// TEST SUITE 2: login Action (Atomic RPC Call & Email Verification Guard)
// =============================================================================

function createAuthActionsFixture(signInResult, rpcHandler = null) {
  const rpcCalls = [];
  const directTableQueries = [];
  const revalidated = [];
  let redirectedTo = null;

  const mockSupabase = {
    auth: {
      signInWithPassword: async () => signInResult,
      signUp: async () => ({ error: null }),
      signOut: async () => {},
    },
    from: (table) => {
      directTableQueries.push({ table, op: 'from' });
      return {
        select: () => ({
          eq: () => ({
            single: async () => {
              directTableQueries.push({ table, op: 'select.single' });
              return { data: null, error: null };
            },
          }),
        }),
        update: () => ({
          eq: async () => {
            directTableQueries.push({ table, op: 'update.eq' });
            return { error: null };
          },
        }),
      };
    },
    rpc: async (fnName, args) => {
      rpcCalls.push({ name: fnName, args });
      if (rpcHandler) return rpcHandler(fnName, args);
      return { data: true, error: null };
    },
  };

  const actions = loadSource('src/features/auth/actions/auth.actions.ts', {
    '@/lib/supabase/server': {
      createClient: async () => mockSupabase,
    },
    'next/navigation': {
      redirect: (url) => {
        redirectedTo = url;
        const err = new Error('NEXT_REDIRECT');
        err.digest = `NEXT_REDIRECT;replace;${url};303;`;
        throw err;
      },
    },
    'next/cache': {
      revalidatePath: (path, type) => revalidated.push({ path, type }),
    },
    '@/config/routes': {
      ROUTES: { dashboard: '/dashboard', login: '/login' },
    },
  });

  return { actions, rpcCalls, directTableQueries, revalidated, getRedirect: () => redirectedTo };
}

// Test 2.1: Unconfirmed email signup DOES NOT claim invitation during login
{
  const fixture = createAuthActionsFixture({
    data: {
      user: {
        id: 'u-unconfirmed-1',
        email: 'unconfirmed@example.com',
        email_confirmed_at: null, // NOT confirmed!
      },
      session: { access_token: 'fake-jwt' },
    },
    error: null,
  });

  let redirected = false;
  try {
    await fixture.actions.login(
      null,
      form({
        email: 'unconfirmed@example.com',
        password: 'password123',
      })
    );
  } catch (err) {
    if (err.message === 'NEXT_REDIRECT') redirected = true;
    else throw err;
  }

  assert.equal(redirected, true, 'Login should succeed and redirect to dashboard');
  assert.equal(fixture.rpcCalls.length, 0, 'Must NOT invoke claim_team_invitation RPC when email is unconfirmed');
  assert.equal(
    fixture.directTableQueries.length,
    0,
    'Must NOT make direct client-side database table queries to profiles or invitations'
  );
  checks++;
}

// Test 2.2: Confirmed email DOES claim invitation atomically via claim_team_invitation RPC
{
  const fixture = createAuthActionsFixture({
    data: {
      user: {
        id: 'u-confirmed-1',
        email: 'confirmed@example.com',
        email_confirmed_at: '2026-11-12T10:00:00Z', // Confirmed!
      },
      session: { access_token: 'fake-jwt' },
    },
    error: null,
  });

  let redirected = false;
  try {
    await fixture.actions.login(
      null,
      form({
        email: 'confirmed@example.com',
        password: 'password123',
      })
    );
  } catch (err) {
    if (err.message === 'NEXT_REDIRECT') redirected = true;
    else throw err;
  }

  assert.equal(redirected, true);
  assert.equal(fixture.rpcCalls.length, 1, 'Must invoke claim_team_invitation RPC once');
  assert.deepEqual(fixture.rpcCalls[0], {
    name: 'claim_team_invitation',
    args: {
      p_user_id: 'u-confirmed-1',
      p_email: 'confirmed@example.com',
    },
  });
  assert.equal(
    fixture.directTableQueries.length,
    0,
    'Client-side multi-step queries must be completely replaced by the atomic RPC'
  );
  checks++;
}

// Test 2.3: Error in claim_team_invitation RPC does not crash login flow
{
  const fixture = createAuthActionsFixture(
    {
      data: {
        user: {
          id: 'u-confirmed-2',
          email: 'error-test@example.com',
          email_confirmed_at: '2026-11-12T10:00:00Z',
        },
        session: { access_token: 'fake-jwt' },
      },
      error: null,
    },
    async () => ({ data: false, error: { message: 'Database lock timeout' } })
  );

  let redirected = false;
  try {
    await fixture.actions.login(
      null,
      form({
        email: 'error-test@example.com',
        password: 'password123',
      })
    );
  } catch (err) {
    if (err.message === 'NEXT_REDIRECT') redirected = true;
    else throw err;
  }

  assert.equal(redirected, true, 'User should still be redirected to dashboard on claim RPC error');
  assert.equal(fixture.rpcCalls.length, 1);
  checks++;
}

// Test 2.4: Invalid credentials return error without attempting any RPC or queries
{
  const fixture = createAuthActionsFixture({
    data: { user: null, session: null },
    error: { message: 'Invalid login credentials' },
  });

  const result = await fixture.actions.login(
    null,
    form({
      email: 'wrong@example.com',
      password: 'wrongpassword',
    })
  );

  assert.equal(result.success, false);
  assert.equal(fixture.rpcCalls.length, 0);
  assert.equal(fixture.directTableQueries.length, 0);
  checks++;
}

// =============================================================================
// TEST SUITE 3: Deterministic Contract Logic for claim_team_invitation
// =============================================================================

function simulateClaimTeamInvitation({
  authUid,
  targetUserId,
  targetEmail,
  authUser,
  userProfile,
  invitations,
}) {
  // Input validations
  if (!targetUserId || !targetEmail) return false;
  const normalizedEmail = targetEmail.trim().toLowerCase();
  if (normalizedEmail === '') return false;

  // Caller authorization: authenticated caller can only claim for itself
  if (authUid && authUid !== targetUserId) return false;

  // Auth user must exist and have confirmed email
  if (!authUser || authUser.id !== targetUserId) return false;
  if (!authUser.email_confirmed_at) return false;

  // Email must match
  if (authUser.email.trim().toLowerCase() !== normalizedEmail) return false;

  // Profile must exist and user must NOT already belong to a team
  if (!userProfile || userProfile.id !== targetUserId) return false;
  if (userProfile.team_id !== null) return false;

  // Find active pending invitation
  const activeInvite = invitations
    .filter(
      (inv) =>
        inv.email.trim().toLowerCase() === normalizedEmail &&
        inv.status === 'pending' &&
        new Date(inv.expires_at) > new Date()
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  if (!activeInvite) return false;

  // Atomic state updates
  userProfile.team_id = activeInvite.team_id;
  userProfile.role = activeInvite.role || 'member';
  activeInvite.status = 'accepted';

  return true;
}

// Test 3.1: Rejection on unconfirmed email in simulated DB contract
{
  const user = { id: 'u-1', email: 'alice@work.com', email_confirmed_at: null };
  const profile = { id: 'u-1', team_id: null, role: 'member' };
  const invites = [
    {
      id: 'i-1',
      email: 'alice@work.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
  ];

  const claimed = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: 'alice@work.com',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(claimed, false, 'Unconfirmed user must be rejected by claim RPC');
  assert.equal(profile.team_id, null);
  assert.equal(invites[0].status, 'pending');
  checks++;
}

// Test 3.2: Rejection on cross-user claim attempt (actor spoofing another user)
{
  const user = { id: 'u-victim', email: 'victim@work.com', email_confirmed_at: '2026-11-12T00:00:00Z' };
  const profile = { id: 'u-victim', team_id: null, role: 'member' };
  const invites = [
    {
      id: 'i-1',
      email: 'victim@work.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
  ];

  const claimed = simulateClaimTeamInvitation({
    authUid: 'u-attacker', // Attacker logged in!
    targetUserId: 'u-victim',
    targetEmail: 'victim@work.com',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(claimed, false, 'Cross-user claim attempt must be rejected');
  assert.equal(profile.team_id, null);
  checks++;
}

// Test 3.3: Rejection on email mismatch
{
  const user = { id: 'u-1', email: 'eve@evil.com', email_confirmed_at: '2026-11-12T00:00:00Z' };
  const profile = { id: 'u-1', team_id: null, role: 'member' };
  const invites = [
    {
      id: 'i-1',
      email: 'alice@work.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
  ];

  const claimed = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: 'alice@work.com', // Trying to claim alice's invite with eve's account
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(claimed, false, 'Email mismatch must be rejected');
  assert.equal(profile.team_id, null);
  checks++;
}

// Test 3.4: Rejection on user already belonging to a team (team immutability)
{
  const user = { id: 'u-1', email: 'alice@work.com', email_confirmed_at: '2026-11-12T00:00:00Z' };
  const profile = { id: 'u-1', team_id: teamB, role: 'member' }; // Already has teamB!
  const invites = [
    {
      id: 'i-1',
      email: 'alice@work.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
  ];

  const claimed = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: 'alice@work.com',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(claimed, false, 'User already assigned to a team cannot claim invitation');
  assert.equal(profile.team_id, teamB);
  assert.equal(invites[0].status, 'pending');
  checks++;
}

// Test 3.5: Rejection on expired or revoked invitation
{
  const user = { id: 'u-1', email: 'alice@work.com', email_confirmed_at: '2026-11-12T00:00:00Z' };
  const profile = { id: 'u-1', team_id: null, role: 'member' };
  const invites = [
    {
      id: 'i-expired',
      email: 'alice@work.com',
      status: 'pending',
      expires_at: new Date(Date.now() - 10000).toISOString(), // Expired
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
    {
      id: 'i-revoked',
      email: 'alice@work.com',
      status: 'revoked', // Revoked
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'member',
    },
  ];

  const claimed = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: 'alice@work.com',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(claimed, false, 'Expired or revoked invitation cannot be claimed');
  assert.equal(profile.team_id, null);
  checks++;
}

// Test 3.6: Successful claim on confirmed email and active invitation, with idempotency
{
  const user = { id: 'u-1', email: 'Alice@Company.com', email_confirmed_at: '2026-11-12T00:00:00Z' };
  const profile = { id: 'u-1', team_id: null, role: 'member' };
  const invites = [
    {
      id: 'i-valid',
      email: 'alice@company.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 100000).toISOString(),
      created_at: new Date().toISOString(),
      team_id: teamA,
      role: 'leader',
    },
  ];

  // First claim succeeds
  const firstClaim = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: '  ALICE@company.COM  ',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(firstClaim, true, 'First claim must succeed');
  assert.equal(profile.team_id, teamA);
  assert.equal(profile.role, 'leader');
  assert.equal(invites[0].status, 'accepted');

  // Second claim fails idempotently (already in team and invite already accepted)
  const secondClaim = simulateClaimTeamInvitation({
    authUid: 'u-1',
    targetUserId: 'u-1',
    targetEmail: 'alice@company.com',
    authUser: user,
    userProfile: profile,
    invitations: invites,
  });

  assert.equal(secondClaim, false, 'Repeated claim must be idempotent and return false');
  checks += 2;
}

console.log(`✅ All atomic invitation claim regression checks passed (${checks} checks).`);
