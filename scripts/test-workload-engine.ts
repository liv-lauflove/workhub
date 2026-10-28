import assert from 'node:assert/strict';

import {
  BASE_TASK_LOAD_POINTS,
  URGENCY_MULTIPLIERS,
  DEADLINE_MULTIPLIERS,
} from '../src/features/workload/types/workload.types';
import {
  getUrgencyMultiplier,
  calculateDeadlineMetrics,
  determineActiveTaskRole,
  isTaskFullyCompleted,
  calculateDynamicTaskScore,
  calculateDualTrackProgress,
  extractCriticalWatchlistTasks,
} from '../src/features/workload/lib/workload-engine';

console.log('--- RUNNING WORKLOAD ENGINE SPEC TESTS (ISSUE #95) ---');

// 1. Test Base Points & Urgency Multipliers
assert.equal(BASE_TASK_LOAD_POINTS, 2.0);
assert.equal(URGENCY_MULTIPLIERS.critical, 2.0);
assert.equal(getUrgencyMultiplier('critical'), 2.0);
assert.equal(getUrgencyMultiplier('urgent'), 2.0);
assert.equal(getUrgencyMultiplier('high'), 1.5);
assert.equal(getUrgencyMultiplier('medium'), 1.0);
assert.equal(getUrgencyMultiplier('low'), 0.5);
assert.equal(getUrgencyMultiplier(''), 1.0);
console.log('✔ Test 1 Passed: Urgency Multipliers');

// 2. Test Deadline Metrics
const now = new Date('2026-10-06T12:00:00Z');

// Overdue: yesterday
const overdue = calculateDeadlineMetrics('2026-10-05T00:00:00Z', now);
assert.equal(overdue.isOverdue, true);
assert.equal(overdue.multiplier, DEADLINE_MULTIPLIERS.overdue);
assert.equal(overdue.isCriticalWatchlist, true);

// Watchlist: in 24 hours (<= 72 jam)
const watchlist = calculateDeadlineMetrics('2026-10-07T12:00:00Z', now);
assert.equal(watchlist.isOverdue, false);
assert.equal(watchlist.multiplier, DEADLINE_MULTIPLIERS.critical_watchlist);
assert.equal(watchlist.isCriticalWatchlist, true);

// Normal: in 5 days
const normal = calculateDeadlineMetrics('2026-10-11T12:00:00Z', now);
assert.equal(normal.multiplier, DEADLINE_MULTIPLIERS.normal);
assert.equal(normal.isCriticalWatchlist, false);

// Long term: in 14 days
const longTerm = calculateDeadlineMetrics('2026-10-20T12:00:00Z', now);
assert.equal(longTerm.multiplier, DEADLINE_MULTIPLIERS.long_term);

// No deadline
const noDeadline = calculateDeadlineMetrics(null, now);
assert.equal(noDeadline.multiplier, DEADLINE_MULTIPLIERS.no_deadline);
console.log('✔ Test 2 Passed: Deadline Multipliers & Thresholds');

// 3. Test Active Role Assignment
// Stage 1: In dev
const devTask = {
  id: 't-1',
  dev_status: 'in_progress',
  test_status: 'pending',
  developer_id: 'dev-1',
  tester_id: 'qa-1',
};
assert.deepEqual(determineActiveTaskRole(devTask), {
  activeRole: 'developer',
  userId: 'dev-1',
});

// Stage 2: Dev done, moves to QA
const qaTask = {
  id: 't-2',
  dev_status: 'dev_done',
  test_status: 'testing',
  developer_id: 'dev-1',
  tester_id: 'qa-1',
};
assert.deepEqual(determineActiveTaskRole(qaTask), {
  activeRole: 'tester',
  userId: 'qa-1',
});

// Stage 3: Completed (dev_done and test_status passed)
const completedTask = {
  id: 't-3',
  dev_status: 'dev_done',
  test_status: 'passed',
  developer_id: 'dev-1',
  tester_id: 'qa-1',
};
assert.equal(isTaskFullyCompleted(completedTask), true);
assert.deepEqual(determineActiveTaskRole(completedTask), {
  activeRole: 'completed',
  userId: null,
});
console.log('✔ Test 3 Passed: Dynamic Role Shifting (Dev -> QA -> Completed)');

// 4. Test Dynamic Workload Score
// Active high task in watchlist: 2.0 (base) * 1.5 (high) * 1.5 (watchlist) = 4.5
const scoreHighWatchlist = calculateDynamicTaskScore(
  {
    id: 't-10',
    priority: 'high',
    due_date: '2026-10-07T12:00:00Z',
    dev_status: 'in_progress',
    developer_id: 'dev-1',
  },
  now
);
assert.equal(scoreHighWatchlist.calculatedPoints, 4.5);
assert.equal(scoreHighWatchlist.activeRole, 'developer');

// Active critical overdue task: 2.0 * 2.0 * 2.0 = 8.0
const scoreCriticalOverdue = calculateDynamicTaskScore(
  {
    id: 't-11',
    priority: 'critical',
    due_date: '2026-10-04T12:00:00Z',
    dev_status: 'dev_done',
    test_status: 'testing',
    tester_id: 'qa-1',
  },
  now
);
assert.equal(scoreCriticalOverdue.calculatedPoints, 8.0);
assert.equal(scoreCriticalOverdue.activeRole, 'tester');

// Completed task yields 0 points immediately
const scoreCompleted = calculateDynamicTaskScore(
  {
    id: 't-12',
    priority: 'critical',
    due_date: '2026-10-04T12:00:00Z',
    dev_status: 'dev_done',
    test_status: 'passed',
  },
  now
);
assert.equal(scoreCompleted.calculatedPoints, 0);
assert.equal(scoreCompleted.activeRole, 'completed');
console.log('✔ Test 4 Passed: Dynamic Workload Point Formulas');

// 5. Test Dual-Track Multi-Tier Progress
const sampleTasks = [
  { dev_status: 'dev_done', test_status: 'passed' }, // 100% done
  { dev_status: 'dev_done', test_status: 'testing' }, // dev done, QA in progress
  { dev_status: 'in_progress', test_status: 'pending' }, // in dev
  { dev_status: 'todo', test_status: 'pending' }, // not started
];

const progress = calculateDualTrackProgress(sampleTasks);
assert.equal(progress.totalTasks, 4);
assert.equal(progress.devDoneTasks, 2); // 2 out of 4 = 50%
assert.equal(progress.testPassedTasks, 1); // 1 out of 4 = 25%
assert.equal(progress.fullyCompletedTasks, 1); // 1 out of 4 = 25%
assert.equal(progress.devProgress, 50);
assert.equal(progress.testProgress, 25);
assert.equal(progress.overallProgress, 25);
console.log('✔ Test 5 Passed: Dual-Track Multi-Tier Progress Engine');

// 6. Test Critical Watchlist Extraction
const watchlistTasks = extractCriticalWatchlistTasks(
  [
    {
      id: 'cw-1',
      title: 'Fix critical production crash',
      priority: 'critical',
      due_date: '2026-10-07T10:00:00Z',
      dev_status: 'in_progress',
      developer: { id: 'dev-1', full_name: 'Budi Santoso', avatar_url: null },
    },
    {
      id: 'cw-2',
      title: 'Low priority backlog',
      priority: 'low',
      due_date: '2026-10-07T10:00:00Z',
      dev_status: 'in_progress',
    },
    {
      id: 'cw-3',
      title: 'High priority long deadline',
      priority: 'high',
      due_date: '2026-11-01T10:00:00Z',
      dev_status: 'in_progress',
    },
  ],
  now
);
assert.equal(watchlistTasks.length, 1);
assert.equal(watchlistTasks[0].id, 'cw-1');
assert.equal(watchlistTasks[0].activePIC?.role, 'developer');
assert.equal(watchlistTasks[0].activePIC?.fullName, 'Budi Santoso');
console.log('✔ Test 6 Passed: Critical Watchlist (< 72 Jam) Extraction');

console.log('\n🎉 ALL 6 WORKLOAD ENGINE TESTS PASSED SUCCESSFULLY! 🎉');
