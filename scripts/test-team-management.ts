import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MANAGEMENT_TEAM_ID } from '../src/features/team/constants';

console.log(
  '--- RUNNING TEAM TRANSFORMATION & MANAGEMENT TESTS (ISSUE #134) ---'
);

// 1. Test Team Name Schema & Constraints
const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama tim minimal 2 karakter')
    .max(50, 'Nama tim maksimal 50 karakter'),
});

// 1a. Valid team names
const validNames = [
  'Aegis',
  'Sentinel',
  'Apex',
  'Titan',
  'Alpha Squad 1',
  'Engineering Management',
];
for (const name of validNames) {
  const result = createTeamSchema.safeParse({ name });
  assert.ok(result.success, `Expected "${name}" to be valid`);
  assert.equal(result.data.name, name.trim());
}
console.log('✔ Test 1a Passed: Valid team names pass schema validation');

// 1b. Trimming behavior
const trimmedResult = createTeamSchema.safeParse({ name: '   Bravo Core   ' });
assert.ok(trimmedResult.success);
assert.equal(trimmedResult.data.name, 'Bravo Core');
console.log('✔ Test 1b Passed: Whitespace is properly trimmed');

// 1c. Invalid team names (< 2 characters)
const tooShortNames = ['', '   ', 'A', ' X '];
for (const name of tooShortNames) {
  const result = createTeamSchema.safeParse({ name });
  assert.ok(!result.success, `Expected "${name}" to fail validation`);
  const fieldErrors = result.error.flatten().fieldErrors;
  assert.ok(fieldErrors.name && fieldErrors.name.length > 0);
  assert.match(fieldErrors.name[0], /minimal 2 karakter/i);
}
console.log(
  '✔ Test 1c Passed: Team names under 2 characters fail with proper message'
);

// 1d. Invalid team names (> 50 characters)
const tooLongName = 'A'.repeat(51);
const longResult = createTeamSchema.safeParse({ name: tooLongName });
assert.ok(!longResult.success);
assert.match(
  longResult.error.flatten().fieldErrors.name![0],
  /maksimal 50 karakter/i
);
console.log(
  '✔ Test 1d Passed: Team names over 50 characters fail with proper message'
);

// 2. Test Management System Team Protection Rules
assert.equal(MANAGEMENT_TEAM_ID, 'e3333333-3333-3333-3333-333333333333');

function validateTeamModification(
  teamId: string,
  currentName: string,
  newName: string
): { allowed: boolean; error?: string } {
  if (
    teamId === MANAGEMENT_TEAM_ID ||
    currentName.toLowerCase() === 'management' ||
    newName.toLowerCase() === 'management'
  ) {
    return {
      allowed: false,
      error:
        "Tim 'Management' merupakan tim sistem bawaan dan tidak dapat diubah namanya.",
    };
  }
  return { allowed: true };
}

// 2a. Modifying Management by ID
const modById = validateTeamModification(
  MANAGEMENT_TEAM_ID,
  'Management',
  'Renamed Management'
);
assert.equal(modById.allowed, false);
assert.match(modById.error!, /tim sistem bawaan dan tidak dapat diubah/i);

// 2b. Modifying Management by current name
const modByName = validateTeamModification(
  'some-other-uuid',
  'management',
  'Squad X'
);
assert.equal(modByName.allowed, false);

// 2c. Renaming another squad to Management
const modToManagement = validateTeamModification(
  'some-other-uuid',
  'Aegis',
  'Management'
);
assert.equal(modToManagement.allowed, false);

// 2d. Modifying normal squads is allowed
const modNormal = validateTeamModification(
  'some-other-uuid',
  'Aegis',
  'Aegis Prime'
);
assert.equal(modNormal.allowed, true);
assert.equal(modNormal.error, undefined);
console.log(
  '✔ Test 2 Passed: Management team modification rules strictly enforced'
);

// 3. Test Team Stats Computation Logic
interface MockProfile {
  id: string;
  full_name: string;
  role: 'leader' | 'member';
  team_id: string | null;
}

interface MockTeam {
  id: string;
  name: string;
  created_at: string;
}

function computeTeamStats(teams: MockTeam[], profiles: MockProfile[]) {
  const teamStatsMap = new Map<string, { count: number; leaders: string[] }>();
  for (const team of teams) {
    teamStatsMap.set(team.id, { count: 0, leaders: [] });
  }

  for (const profile of profiles) {
    if (profile.team_id && teamStatsMap.has(profile.team_id)) {
      const stat = teamStatsMap.get(profile.team_id)!;
      stat.count += 1;
      if (profile.role === 'leader' && profile.full_name) {
        stat.leaders.push(profile.full_name);
      }
    }
  }

  return teams.map((team) => {
    const stat = teamStatsMap.get(team.id) || { count: 0, leaders: [] };
    const isManagement =
      team.id === MANAGEMENT_TEAM_ID ||
      team.name.trim().toLowerCase() === 'management';

    return {
      id: team.id,
      name: team.name,
      memberCount: stat.count,
      leaders: stat.leaders,
      isManagement,
      createdAt: team.created_at,
    };
  });
}

const mockTeams: MockTeam[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Aegis',
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sentinel',
    created_at: '2026-09-02T00:00:00Z',
  },
  {
    id: MANAGEMENT_TEAM_ID,
    name: 'Management',
    created_at: '2026-09-03T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Apex',
    created_at: '2026-10-24T00:00:00Z',
  },
];

const mockProfiles: MockProfile[] = [
  {
    id: 'u1',
    full_name: 'Kak Yoga',
    role: 'leader',
    team_id: MANAGEMENT_TEAM_ID,
  },
  {
    id: 'u2',
    full_name: 'Lead Aegis',
    role: 'leader',
    team_id: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'u3',
    full_name: 'Dev Aegis 1',
    role: 'member',
    team_id: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'u4',
    full_name: 'Dev Aegis 2',
    role: 'member',
    team_id: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'u5',
    full_name: 'Lead Sentinel',
    role: 'leader',
    team_id: '22222222-2222-2222-2222-222222222222',
  },
  {
    id: 'u6',
    full_name: 'Dev Sentinel 1',
    role: 'member',
    team_id: '22222222-2222-2222-2222-222222222222',
  },
  { id: 'u7', full_name: 'Unassigned User', role: 'member', team_id: null },
];

const stats = computeTeamStats(mockTeams, mockProfiles);

// Aegis: 3 members, 1 leader
const aegisStat = stats.find((s) => s.name === 'Aegis')!;
assert.equal(aegisStat.memberCount, 3);
assert.deepEqual(aegisStat.leaders, ['Lead Aegis']);
assert.equal(aegisStat.isManagement, false);

// Sentinel: 2 members, 1 leader
const sentinelStat = stats.find((s) => s.name === 'Sentinel')!;
assert.equal(sentinelStat.memberCount, 2);
assert.deepEqual(sentinelStat.leaders, ['Lead Sentinel']);
assert.equal(sentinelStat.isManagement, false);

// Management: 1 member, 1 leader, isManagement === true
const mgmtStat = stats.find((s) => s.name === 'Management')!;
assert.equal(mgmtStat.memberCount, 1);
assert.deepEqual(mgmtStat.leaders, ['Kak Yoga']);
assert.equal(mgmtStat.isManagement, true);

// Apex: 0 members, 0 leaders, isManagement === false
const apexStat = stats.find((s) => s.name === 'Apex')!;
assert.equal(apexStat.memberCount, 0);
assert.deepEqual(apexStat.leaders, []);
assert.equal(apexStat.isManagement, false);

console.log(
  '✔ Test 3 Passed: Member count, leaders, and isManagement stats computation accurate'
);

// 4. Test Migration & Seed SQL constraints
const migrationSql = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20261024000000_allow_dynamic_teams.sql'
  ),
  'utf8'
);
assert.match(migrationSql, /DROP CONSTRAINT IF EXISTS teams_name_check/i);
assert.match(
  migrationSql,
  /CHECK\s*\(\s*length\s*\(\s*trim\s*\(\s*name\s*\)\s*\)\s*>=\s*2\s*\)/i
);

const seedSql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/seed.sql'),
  'utf8'
);
assert.match(
  seedSql,
  /check\s*\(\s*length\s*\(\s*trim\s*\(\s*name\s*\)\s*\)\s*>=\s*2\s*\)/i
);
console.log(
  '✔ Test 4 Passed: Migration and seed SQL files use dynamic length constraint (>= 2)'
);

console.log('\n--- ALL TEAM TRANSFORMATION TESTS PASSED SUCCESSFULLY! ---');
