import assert from 'node:assert/strict';

import {
  SYSTEM_PROMPTS,
  OUT_OF_SCOPE_DECLINE_MESSAGE,
} from '../src/features/ai/lib/prompt-templates';
import {
  parseDurationToHours,
  detectPriorityOverride,
} from '../src/features/ai/lib/task-prioritizing';

console.log('--- RUNNING AI GUARDRAILS & OVERRIDE SPEC TESTS (ISSUE #46) ---');

// 1. Test OUT_OF_SCOPE_DECLINE_MESSAGE & Domain Boundary in System Prompt
assert.ok(OUT_OF_SCOPE_DECLINE_MESSAGE.length > 0);
assert.match(
  OUT_OF_SCOPE_DECLINE_MESSAGE,
  /asisten Workhub|software engineering/i,
  'Decline message must identify role'
);
assert.match(
  OUT_OF_SCOPE_DECLINE_MESSAGE,
  /manajemen proyek|alur kerja teknis/i,
  'Decline message must guide user to in-scope domains'
);
console.log('✔ Test 1 Passed: Out-of-scope decline message structure');

// 1b. Verify SYSTEM_PROMPTS.engineeringManager contains Section 4 Guardrails
const engManagerPrompt = SYSTEM_PROMPTS.engineeringManager;
assert.match(
  engManagerPrompt,
  /AI Guardrails & Human Sovereignty/i,
  'System prompt must include Human Sovereignty section'
);
assert.match(
  engManagerPrompt,
  /Domain Boundary/i,
  'System prompt must state out-of-scope domain boundary'
);
assert.match(
  engManagerPrompt,
  /politik|presiden|selebriti|resep masakan/i,
  'System prompt must list non-engineering examples to reject'
);
assert.match(
  engManagerPrompt,
  /advisory co-pilot/i,
  'System prompt must state AI is advisory-only'
);
console.log(
  '✔ Test 2 Passed: System prompt contains domain boundaries & Human Sovereignty'
);

// 2. Test parseDurationToHours Utility
// 2a. Hours
assert.equal(parseDurationToHours('2 jam'), 2);
assert.equal(parseDurationToHours('1.5 jam'), 1.5);
assert.equal(parseDurationToHours('4 hours'), 4);
assert.equal(parseDurationToHours('8 h'), 8);
assert.equal(parseDurationToHours('0.5 jam'), 0.5);

// 2b. Days (assuming 8 hours per workday)
assert.equal(parseDurationToHours('1 hari'), 8);
assert.equal(parseDurationToHours('2 hari'), 16);
assert.equal(parseDurationToHours('3 days'), 24);

// 2c. Minutes
assert.equal(parseDurationToHours('30 menit'), 0.5);
assert.equal(parseDurationToHours('45 menit'), 0.75);
assert.equal(parseDurationToHours('60 minutes'), 1);

// 2d. Weeks (assuming 40 hours per workweek)
assert.equal(parseDurationToHours('1 minggu'), 40);
assert.equal(parseDurationToHours('2 weeks'), 80);

// 2e. Edge cases & invalid strings
assert.equal(parseDurationToHours(''), null);
assert.equal(parseDurationToHours(null), null);
assert.equal(parseDurationToHours(undefined), null);
assert.equal(parseDurationToHours('tidak diketahui'), null);
assert.equal(parseDurationToHours('segera'), null);
console.log(
  '✔ Test 3 Passed: parseDurationToHours converts various formats correctly'
);

// 3. Test detectPriorityOverride Utility
// 3a. Distinct priorities -> Override detected (true)
assert.equal(detectPriorityOverride('high', 'medium'), true);
assert.equal(detectPriorityOverride('critical', 'high'), true);
assert.equal(detectPriorityOverride('low', 'critical'), true);
assert.equal(detectPriorityOverride('medium', 'low'), true);

// 3b. Matching priorities -> No override (false)
assert.equal(detectPriorityOverride('critical', 'critical'), false);
assert.equal(detectPriorityOverride('high', 'high'), false);
assert.equal(detectPriorityOverride('medium', 'medium'), false);
assert.equal(detectPriorityOverride('low', 'low'), false);

// 3c. Missing/null suggestion -> No override (false)
assert.equal(detectPriorityOverride('high', null), false);
assert.equal(detectPriorityOverride('critical', undefined), false);
console.log(
  '✔ Test 4 Passed: detectPriorityOverride correctly identifies manual overrides'
);

console.log('\n--- ALL AI GUARDRAIL SPEC TESTS PASSED! ---');
