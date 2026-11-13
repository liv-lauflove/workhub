import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const requireProject = createRequire(path.join(root, 'package.json'));
const ts = requireProject('typescript');

function loadSource(relative, dependencies) {
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
    throw new Error(
      `Unexpected dependency in profile permission test: ${name}`
    );
  };
  new Function('require', 'module', 'exports', output)(
    requireSource,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}

const { MANAGEMENT_TEAM_ID } = loadSource('src/features/team/constants.ts', {});
const invitationUtils = loadSource('src/features/team/invitation-utils.ts', {});
const teamScope = loadSource('src/features/team/team-scope.ts', {});
const teamA = 'b1450000-0000-4000-8000-000000000001';
const teamB = 'b1450000-0000-4000-8000-000000000002';
const userId = 'a1450000-0000-4000-8000-000000000001';

function fixture(actor, response) {
  const calls = [];
  const revalidated = [];
  const client = {
    from() {
      throw new Error('Privileged profile changes must use the authorized RPC');
    },
    async rpc(name, args) {
      calls.push({ name, args });
      return response ?? { data: args.p_user_id, error: null };
    },
  };
  const server = { createClient: async () => client };
  const queries = loadSource('src/features/team/queries/team.queries.ts', {
    'server-only': {},
    '@/lib/supabase/server': server,
    '../constants': { MANAGEMENT_TEAM_ID },
    '../invitation-utils': invitationUtils,
  });
  const actions = loadSource('src/features/team/actions/team.actions.ts', {
    '@/lib/supabase/server': server,
    '@/lib/supabase/admin': {
      createAdminClient() {
        throw new Error('Profile management must not bypass RPC authorization');
      },
    },
    '@/features/auth/queries/auth.queries': {
      getUserProfile: async () => actor,
    },
    '../queries/team.queries': queries,
    '../invitation-utils': invitationUtils,
    'next/cache': { revalidatePath: (route) => revalidated.push(route) },
  });
  return { actions, queries, calls, revalidated };
}

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

const leader = { id: userId, role: 'leader', team_id: teamA };
const roleInput = { userId, teamId: teamA, role: 'leader' };
const capacityInput = { userId, teamId: teamA, capacityPoints: '150' };
let checks = 0;

for (const actor of [
  null,
  { ...leader, role: 'member' },
  { ...leader, role: 'member', team_id: MANAGEMENT_TEAM_ID },
  { ...leader, team_id: null },
  { ...leader, team_id: teamB, teams: { name: 'Management' } },
]) {
  for (const [action, values] of [
    ['updateMemberRole', roleInput],
    ['updateMemberCapacity', capacityInput],
  ]) {
    const f = fixture(actor);
    assert.equal((await f.actions[action](null, form(values))).success, false);
    assert.equal(f.calls.length, 0);
    assert.equal(f.revalidated.length, 0);
    checks++;
  }
}

for (const actor of [leader, { ...leader, team_id: MANAGEMENT_TEAM_ID }]) {
  const f = fixture(actor);
  assert.equal(
    (await f.actions.updateMemberRole(null, form(roleInput))).success,
    true
  );
  assert.deepEqual(f.calls, [
    {
      name: 'update_team_member',
      args: { p_user_id: userId, p_team_id: teamA, p_role: 'leader' },
    },
  ]);
  assert.deepEqual(f.revalidated, ['/team']);
  checks++;
}

for (const points of ['10', '1000']) {
  const f = fixture(leader);
  assert.equal(
    (
      await f.actions.updateMemberCapacity(
        null,
        form({ ...capacityInput, capacityPoints: points })
      )
    ).success,
    true
  );
  assert.deepEqual(f.calls[0], {
    name: 'update_team_member',
    args: {
      p_user_id: userId,
      p_team_id: teamA,
      p_capacity_points: Number(points),
    },
  });
  assert.deepEqual(f.revalidated, ['/team', '/workload']);
  checks++;
}

for (const values of [
  { ...roleInput, userId: 'not-a-uuid' },
  { ...roleInput, teamId: '' },
  { ...roleInput, role: 'admin' },
]) {
  const f = fixture(leader);
  assert.equal(
    (await f.actions.updateMemberRole(null, form(values))).success,
    false
  );
  assert.equal(f.calls.length, 0);
  checks++;
}

for (const points of ['', '150junk', '10.5', '9', '1001', 'Infinity', 'NaN']) {
  const f = fixture(leader);
  assert.equal(
    (
      await f.actions.updateMemberCapacity(
        null,
        form({ ...capacityInput, capacityPoints: points })
      )
    ).success,
    false
  );
  assert.equal(f.calls.length, 0);
  checks++;
}

for (const response of [
  { data: null, error: null },
  { data: 'a1450000-0000-4000-8000-000000000099', error: null },
  { data: null, error: { message: 'Anggota tidak ditemukan.', code: 'P0002' } },
  { data: null, error: { message: 'Hak akses berubah.', code: '42501' } },
  { data: null, error: { message: 'Leader terakhir.', code: '23514' } },
]) {
  for (const [action, values] of [
    ['updateMemberRole', roleInput],
    ['updateMemberCapacity', capacityInput],
  ]) {
    const f = fixture(leader, response);
    assert.equal((await f.actions[action](null, form(values))).success, false);
    assert.equal(f.calls.length, 1);
    assert.equal(f.revalidated.length, 0);
    checks++;
  }
}

const uppercase = fixture(leader);
assert.equal(
  (
    await uppercase.actions.updateMemberRole(
      null,
      form({
        ...roleInput,
        userId: userId.toUpperCase(),
        teamId: teamA.toUpperCase(),
      })
    )
  ).success,
  true
);
assert.equal(uppercase.calls[0].args.p_user_id, userId);
assert.equal(uppercase.calls[0].args.p_team_id, teamA);
checks++;

const management = fixture(leader).queries;
assert.equal(await management.isManagementTeam(MANAGEMENT_TEAM_ID), true);
for (const other of [teamA, teamB, null, undefined, 'Management']) {
  assert.equal(await management.isManagementTeam(other), false);
  checks++;
}

const sampleTeams = [
  { id: teamA, name: 'Aegis' },
  { id: teamB, name: 'Sentinel' },
  { id: MANAGEMENT_TEAM_ID, name: 'Management' },
];

for (const requestedTeam of [undefined, 'all', 'sentinel', teamB, 'management']) {
  const scope = teamScope.resolveTeamPageScope({
    isManagement: false,
    userTeamId: teamA,
    requestedTeam,
    teams: sampleTeams,
  });
  assert.equal(scope.isOverview, false);
  assert.equal(scope.targetTeam?.id, teamA);
  checks++;
}

const orphanedScope = teamScope.resolveTeamPageScope({
  isManagement: false,
  userTeamId: 'missing-team-id',
  requestedTeam: 'all',
  teams: sampleTeams,
});
assert.equal(orphanedScope.isOverview, false);
assert.equal(orphanedScope.targetTeam, undefined);
checks++;

const mgmtOverview = teamScope.resolveTeamPageScope({
  isManagement: true,
  userTeamId: MANAGEMENT_TEAM_ID,
  requestedTeam: undefined,
  teams: sampleTeams,
});
assert.equal(mgmtOverview.isOverview, true);
assert.equal(mgmtOverview.targetTeam, undefined);

const mgmtDrilldown = teamScope.resolveTeamPageScope({
  isManagement: true,
  userTeamId: MANAGEMENT_TEAM_ID,
  requestedTeam: 'sentinel',
  teams: sampleTeams,
});
assert.equal(mgmtDrilldown.isOverview, false);
assert.equal(mgmtDrilldown.targetTeam?.id, teamB);
checks += 2;

console.log(`Profile permission action regression checks passed: ${checks}`);
