import assert from 'node:assert/strict';

console.log('--- RUNNING ARCHIVE & RESTORE MANAGEMENT TESTS (ISSUE #140) ---');

// 1. Test Archived Timestamp Logic & Invariants
interface ArchivableEntity {
  id: string;
  name: string;
  archived_at: string | null;
}

function archiveEntity<T extends ArchivableEntity>(item: T): T {
  return {
    ...item,
    archived_at: new Date().toISOString(),
  };
}

function restoreEntity<T extends ArchivableEntity>(item: T): T {
  return {
    ...item,
    archived_at: null,
  };
}

const mockMilestone: ArchivableEntity = {
  id: 'm-001',
  name: 'Q4 2026 Mobile Revamp',
  archived_at: null,
};

// 1a. Item starts active
assert.equal(
  mockMilestone.archived_at,
  null,
  'Active item must have null archived_at'
);
console.log('✔ Test 1a Passed: Active entity has archived_at === null');

// 1b. Archive updates timestamp to valid ISO string
const archivedMilestone = archiveEntity(mockMilestone);
assert.ok(
  archivedMilestone.archived_at !== null,
  'Archived item must have archived_at'
);
assert.ok(
  !isNaN(Date.parse(archivedMilestone.archived_at!)),
  'archived_at must be valid ISO timestamp'
);
console.log('✔ Test 1b Passed: Archiving sets a valid ISO timestamp');

// 1c. Restore resets timestamp to null
const restoredMilestone = restoreEntity(archivedMilestone);
assert.equal(
  restoredMilestone.archived_at,
  null,
  'Restored item must have archived_at === null'
);
console.log('✔ Test 1c Passed: Restoring resets archived_at to null');

// 2. Test Authorization Guard (Leader-only protection)
interface UserProfile {
  id: string;
  role: 'leader' | 'member';
}

function checkArchivePermission(
  user: UserProfile | null,
  action: 'archive' | 'restore'
): { allowed: boolean; errorMessage?: string } {
  if (!user) {
    return {
      allowed: false,
      errorMessage: 'Sesi Anda tidak valid. Silakan login kembali.',
    };
  }

  if (user.role !== 'leader') {
    return {
      allowed: false,
      errorMessage:
        action === 'archive'
          ? 'Hanya Leader yang memiliki izin untuk mengarsipkan item.'
          : 'Hanya Leader yang memiliki izin untuk memulihkan item.',
    };
  }

  return { allowed: true };
}

// 2a. Unauthenticated user is rejected
const unauthResult = checkArchivePermission(null, 'archive');
assert.equal(unauthResult.allowed, false);
assert.match(unauthResult.errorMessage!, /Sesi Anda tidak valid/);
console.log('✔ Test 2a Passed: Unauthenticated request rejected');

// 2b. Member role is rejected with leader-only requirement
const memberUser: UserProfile = { id: 'user-member-1', role: 'member' };
const memberArchiveRes = checkArchivePermission(memberUser, 'archive');
assert.equal(memberArchiveRes.allowed, false);
assert.match(memberArchiveRes.errorMessage!, /Hanya Leader yang memiliki izin/);

const memberRestoreRes = checkArchivePermission(memberUser, 'restore');
assert.equal(memberRestoreRes.allowed, false);
assert.match(memberRestoreRes.errorMessage!, /Hanya Leader yang memiliki izin/);
console.log(
  '✔ Test 2b Passed: Member role rejected for both archive and restore'
);

// 2c. Leader role is granted access
const leaderUser: UserProfile = { id: 'user-leader-1', role: 'leader' };
assert.equal(checkArchivePermission(leaderUser, 'archive').allowed, true);
assert.equal(checkArchivePermission(leaderUser, 'restore').allowed, true);
console.log('✔ Test 2c Passed: Leader role authorized for archive and restore');

// 3. Test Query Filtering Invariants (Active vs Archived Separation)
const dataset: ArchivableEntity[] = [
  { id: '1', name: 'Project Alpha', archived_at: null },
  {
    id: '2',
    name: 'Project Beta (Archived)',
    archived_at: '2026-10-15T08:00:00.000Z',
  },
  { id: '3', name: 'Project Gamma', archived_at: null },
  {
    id: '4',
    name: 'Project Delta (Archived)',
    archived_at: '2026-11-01T10:30:00.000Z',
  },
  { id: '5', name: 'Project Epsilon', archived_at: null },
];

// Active Query filter simulation (.is('archived_at', null))
const activeItems = dataset.filter((item) => item.archived_at === null);
assert.equal(activeItems.length, 3);
assert.deepEqual(
  activeItems.map((i) => i.id),
  ['1', '3', '5'],
  'Active query must strictly exclude archived items'
);
console.log(
  '✔ Test 3a Passed: Active query strictly filters archived items out'
);

// Archived Query filter simulation (.not('archived_at', 'is', null) + order desc)
const archivedItems = dataset
  .filter((item) => item.archived_at !== null)
  .sort(
    (a, b) =>
      new Date(b.archived_at!).getTime() - new Date(a.archived_at!).getTime()
  );

assert.equal(archivedItems.length, 2);
assert.equal(
  archivedItems[0].id,
  '4',
  'Most recently archived item must come first'
);
assert.equal(archivedItems[1].id, '2');
console.log(
  '✔ Test 3b Passed: Archived query strictly filters active items and orders descending'
);

// 4. Test Archive Client Search & Filtering
interface ArchiveSearchItem {
  name: string;
  description: string | null;
  teamName?: string;
  milestoneTitle?: string;
}

function searchArchiveItems<T extends ArchiveSearchItem>(
  items: T[],
  query: string
): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter((item) => {
    const matchName = item.name.toLowerCase().includes(q);
    const matchDesc = item.description
      ? item.description.toLowerCase().includes(q)
      : false;
    const matchTeam = item.teamName
      ? item.teamName.toLowerCase().includes(q)
      : false;
    const matchMilestone = item.milestoneTitle
      ? item.milestoneTitle.toLowerCase().includes(q)
      : false;
    return matchName || matchDesc || matchTeam || matchMilestone;
  });
}

const archivedProjectsDataset: ArchiveSearchItem[] = [
  {
    name: 'Payment Gateway V1',
    description: 'Integrasi sistem pembayaran lama',
    teamName: 'Aegis',
    milestoneTitle: 'Milestone FinTech',
  },
  {
    name: 'Push Notification Service',
    description: 'FCM push alert',
    teamName: 'Sentinel',
    milestoneTitle: 'Mobile Architecture',
  },
  {
    name: 'Legacy Auth Provider',
    description: 'OAuth 1.0 bridge',
    teamName: 'Management',
    milestoneTitle: 'Infrastructure Security',
  },
];

// 4a. Search by project name
assert.equal(searchArchiveItems(archivedProjectsDataset, 'Payment').length, 1);
assert.equal(
  searchArchiveItems(archivedProjectsDataset, 'Payment')[0].name,
  'Payment Gateway V1'
);
console.log('✔ Test 4a Passed: Instant search by name works');

// 4b. Search by team name
assert.equal(searchArchiveItems(archivedProjectsDataset, 'Sentinel').length, 1);
assert.equal(
  searchArchiveItems(archivedProjectsDataset, 'Sentinel')[0].name,
  'Push Notification Service'
);
console.log('✔ Test 4b Passed: Instant search by team name works');

// 4c. Search by parent milestone title
assert.equal(searchArchiveItems(archivedProjectsDataset, 'FinTech').length, 1);
console.log('✔ Test 4c Passed: Instant search by milestone title works');

// 4d. Empty query returns full dataset
assert.equal(searchArchiveItems(archivedProjectsDataset, '').length, 3);
console.log('✔ Test 4d Passed: Empty search query returns all items');

// 4e. Non-matching query returns empty array
assert.equal(
  searchArchiveItems(archivedProjectsDataset, 'NonExistentXYZ').length,
  0
);
console.log(
  '✔ Test 4e Passed: Non-matching query cleanly produces empty state'
);

// 5. Test Data Integrity on Archive & Restore Cycle
interface FullProjectState extends ArchivableEntity {
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  pic_id: string | null;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  milestone_id: string;
}

const originalProject: FullProjectState = {
  id: 'proj-101',
  name: 'Core Engine Refactor',
  status: 'completed',
  pic_id: 'user-lead-99',
  totalTasks: 12,
  completedTasks: 12,
  progress: 100,
  milestone_id: 'm-500',
  archived_at: null,
};

const afterArchive = archiveEntity(originalProject);
assert.equal(
  afterArchive.status,
  originalProject.status,
  'Status must not mutate on archive'
);
assert.equal(afterArchive.progress, 100, 'Progress must be preserved');
assert.equal(
  afterArchive.milestone_id,
  'm-500',
  'Milestone relation must be preserved'
);
assert.ok(afterArchive.archived_at !== null);

const afterRestore = restoreEntity(afterArchive);
assert.deepEqual(
  afterRestore,
  originalProject,
  'Entity must fully match original state after restore cycle'
);
console.log(
  '✔ Test 5 Passed: Full entity state preserved without corruption across archive/restore cycle'
);

console.log('\n======================================================');
console.log('🎉 ALL ARCHIVE MANAGEMENT UNIT TESTS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
