import assert from 'node:assert/strict';

import {
  buildTaskPriorityPrompt,
  TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT,
} from '../src/features/ai/lib/prompt-templates';
import {
  generateFallbackPrediction,
  parsePredictionOutput,
} from '../src/features/ai/lib/task-prioritizing';
import type { TaskPriorityPredictionResult } from '../src/features/ai/types/ai.types';

console.log('--- RUNNING AI AUTO-PRIORITIZING SPEC TESTS (ISSUE #45) ---');

// 1. Test buildTaskPriorityPrompt
const basicPrompt = buildTaskPriorityPrompt({
  title: 'Perbaiki tombol simpan profil',
});
assert.match(basicPrompt, /Task Title: "Perbaiki tombol simpan profil"/);
assert.doesNotMatch(basicPrompt, /Task Description:/);
assert.doesNotMatch(basicPrompt, /Customer Support/);
console.log('✔ Test 1 Passed: Basic prompt formatting');

const fullPrompt = buildTaskPriorityPrompt({
  title: 'Investigasi kegagalan payment gateway',
  description: 'Webhook Midtrans mengembalikan status 500 saat callback.',
  columnName: 'In Progress',
  isCsComplaint: true,
});
assert.match(fullPrompt, /Task Title: "Investigasi kegagalan payment gateway"/);
assert.match(fullPrompt, /Task Description: "Webhook Midtrans/);
assert.match(fullPrompt, /Target Status Column: "In Progress"/);
assert.match(fullPrompt, /Origin: Customer Support/);
console.log('✔ Test 2 Passed: Full context prompt formatting');

// 2. Test TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT
assert.match(TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT, /suggestedPriority/);
assert.match(TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT, /estimatedDuration/);
assert.match(TASK_PRIORITY_PREDICTION_SYSTEM_PROMPT, /reason/);
console.log(
  '✔ Test 3 Passed: System prompt instructions contains required schema'
);

// 3. Test generateFallbackPrediction heuristics
// 3a. CS Complaint -> Critical
const csResult: TaskPriorityPredictionResult = generateFallbackPrediction(
  'User tidak bisa cetak invoice',
  true
);
assert.equal(csResult.suggestedPriority, 'critical');
assert.match(csResult.reason, /keluhan pelanggan \(CS\)/i);
console.log('✔ Test 4 Passed: CS Complaint auto-prioritized to Critical');

// 3b. Downtime / Payment / Crash -> Critical
const crashResult = generateFallbackPrediction(
  'Server crash saat checkout pembayaran'
);
assert.equal(crashResult.suggestedPriority, 'critical');
console.log('✔ Test 5 Passed: Payment / Crash keyword prioritized to Critical');

// 3c. Bug / Fix / Error -> High
const bugResult = generateFallbackPrediction(
  'Fix bug validasi email pendaftaran'
);
assert.equal(bugResult.suggestedPriority, 'high');
assert.match(bugResult.reason, /Perbaikan kendala/i);
console.log('✔ Test 6 Passed: Bug / Fix keyword prioritized to High');

// 3d. UI / Style / Typo -> Low
const uiResult = generateFallbackPrediction(
  'Perbaiki typo pada footer copyright dan icon margin'
);
assert.equal(uiResult.suggestedPriority, 'low');
assert.equal(uiResult.estimatedDuration, '30 menit');
console.log('✔ Test 7 Passed: UI / Typo cosmetic keyword prioritized to Low');

// 3e. Standard Feature -> Medium
const standardResult = generateFallbackPrediction(
  'Buat endpoint export data pengguna ke CSV'
);
assert.equal(standardResult.suggestedPriority, 'medium');
assert.ok(standardResult.estimatedDuration.length > 0);
console.log('✔ Test 8 Passed: Normal task prioritized to Medium');

// 4. Test parsePredictionOutput from LLM JSON response
const validJson = JSON.stringify({
  suggestedPriority: 'high',
  estimatedDuration: '1-2 jam',
  reason: 'Bug pada form login menghalangi akses pengguna.',
});
const parsed = parsePredictionOutput(validJson, 'Bug login form');
assert.equal(parsed.suggestedPriority, 'high');
assert.equal(parsed.estimatedDuration, '1-2 jam');
assert.match(parsed.reason, /Bug pada form login/);

// 4b. Handles code fence wrapping ```json ... ```
const fencedJson = `\`\`\`json
{
  "suggestedPriority": "critical",
  "estimatedDuration": "30 menit",
  "reason": "Token auth bocor di log console."
}
\`\`\``;
const parsedFenced = parsePredictionOutput(fencedJson, 'Token leak');
assert.equal(parsedFenced.suggestedPriority, 'critical');
assert.equal(parsedFenced.estimatedDuration, '30 menit');
console.log(
  '✔ Test 9 Passed: LLM JSON parser handles code fences and valid payloads'
);

console.log('--- ALL AI AUTO-PRIORITIZING SPEC TESTS PASSED! ---');
