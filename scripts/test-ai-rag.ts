import assert from 'node:assert/strict';

import {
  WORKHUB_SCHEMA_DICTIONARY,
  getSchemaDictionaryString,
  searchSchemaDictionary,
} from '../src/features/ai/rag/schema-dictionary';
import {
  WORKHUB_WORKFLOW_RULES,
  getWorkflowRulesString,
  searchWorkflowRules,
} from '../src/features/ai/rag/workflow-rules';
import {
  classifyRagIntent,
  retrieveRelevantKnowledge,
  buildRagPromptHeader,
} from '../src/features/ai/rag/knowledge-extractor';
import { determineAvailabilityStatus } from '../src/features/ai/rag/workload-status';
import type { MemberWorkload } from '../src/features/workload/types/workload.types';

console.log('--- RUNNING AI RAG & KNOWLEDGE BASE SPEC TESTS (ISSUE #97) ---');

// 1. Test Schema Dictionary Knowledge Base
assert.ok(
  WORKHUB_SCHEMA_DICTIONARY.length >= 7,
  'Must contain at least 7 core tables'
);
const tableNames = WORKHUB_SCHEMA_DICTIONARY.map((t) => t.tableName);
assert.ok(tableNames.includes('projects'), 'Must document projects table');
assert.ok(tableNames.includes('tasks'), 'Must document tasks table');
assert.ok(
  tableNames.includes('task_columns'),
  'Must document task_columns table'
);
assert.ok(tableNames.includes('profiles'), 'Must document profiles table');
assert.ok(tableNames.includes('teams'), 'Must document teams table');
assert.ok(
  tableNames.includes('capacity_settings'),
  'Must document capacity_settings table'
);
assert.ok(
  tableNames.includes('ai_suggestion_overrides'),
  'Must document ai_suggestion_overrides table'
);

const schemaDocString = getSchemaDictionaryString();
assert.match(schemaDocString, /Kamus Schema Database Workhub/);
assert.match(schemaDocString, /github_branch/);
assert.match(schemaDocString, /capacity_points/);
console.log(
  '✔ Test 1 Passed: Schema dictionary definitions and markdown serialization'
);

// 1b. Test searchSchemaDictionary
const taskSearch = searchSchemaDictionary('tasks');
assert.match(taskSearch, /Tabel: `tasks`/);
const generalSearch = searchSchemaDictionary('xyz_random_nonexistent');
assert.ok(generalSearch.length > 100);
console.log('✔ Test 2 Passed: Schema keyword search retriever');

// 2. Test Workflow Rules Knowledge Base
assert.ok(
  WORKHUB_WORKFLOW_RULES.length >= 5,
  'Must contain at least 5 workflow sections'
);
const workflowDocString = getWorkflowRulesString();
assert.match(
  workflowDocString,
  /Dual-Assignee/i,
  'Must contain Dual-Assignee policy'
);
assert.match(
  workflowDocString,
  /Definisi Selesai/i,
  'Must contain Definition of Done'
);
assert.match(
  workflowDocString,
  /100% selesai/i,
  'Must state 100% requires both Dev and QA'
);
assert.match(
  workflowDocString,
  /Sistem 20 Poin/i,
  'Must state 20-point workload system'
);
assert.match(
  workflowDocString,
  /Konvensi Penamaan Git Branch/i,
  'Must state branch naming conventions'
);

// 2b. Test searchWorkflowRules
const testingSearch = searchWorkflowRules('testing QA checklist');
assert.match(testingSearch, /Dual-Assignee/i);
console.log(
  '✔ Test 3 Passed: Workflow rules documentation and search retriever'
);

// 3. Test Intent Classification & Knowledge Extractor
// 3a. Workload / Member Availability
const qWorkload1 = classifyRagIntent(
  'member mana yang available aku kasih task?'
);
assert.equal(qWorkload1.category, 'workload');
assert.equal(qWorkload1.requiresWorkload, true);

const qWorkload2 = classifyRagIntent('siapa yang bisa aku assign task baru?');
assert.equal(qWorkload2.category, 'workload');
assert.equal(qWorkload2.requiresWorkload, true);

const qWorkload3 = classifyRagIntent('apakah tim sedang overload?');
assert.equal(qWorkload3.category, 'workload');
assert.equal(qWorkload3.requiresWorkload, true);

// 3b. Schema queries
const qSchema = classifyRagIntent(
  'apa saja kolom dan relasi pada tabel tasks?'
);
assert.equal(qSchema.category, 'schema');
assert.equal(qSchema.requiresWorkload, false);

// 3c. Workflow queries
const qWorkflow = classifyRagIntent(
  'bagaimana alur transisi task dari dev ke testing?'
);
assert.equal(qWorkflow.category, 'workflow');
assert.equal(qWorkflow.requiresWorkload, false);

console.log(
  '✔ Test 4 Passed: Intent classification distinguishes workload, schema, and workflow'
);

// 3d. Test retrieveRelevantKnowledge & buildRagPromptHeader
const ragResult = retrieveRelevantKnowledge('member mana yang available?');
assert.equal(ragResult.requiresWorkloadContext, true);
assert.ok(ragResult.matchedSections.some((s) => s.includes('capacity')));

const ragHeader = buildRagPromptHeader('member mana yang available?');
assert.match(ragHeader, /INTERNAL KNOWLEDGE BASE \(RAG - SCHEMA & WORKFLOW\)/);
assert.match(ragHeader, /Important Guardrails:/);
console.log(
  '✔ Test 5 Passed: Knowledge retrieval and RAG prompt header assembly'
);

// 4. Test Workload Availability Determination
const baseMockMember: MemberWorkload = {
  userId: 'mock-1',
  fullName: 'Budi Santoso',
  avatarUrl: null,
  role: 'member',
  position: 'Frontend Developer',
  capacityPoints: 20,
  teamId: 'team-1',
  activeTaskCount: 1,
  totalWeight: 6.0,
  baselinePoints: 20,
  capacityPercentage: 30,
  isOverloaded: false,
  tasksSummary: { urgentCount: 0, highCount: 0, mediumCount: 1, lowCount: 0 },
};

// 4a. Available member: low capacity percentage & <= 2 tasks
assert.equal(determineAvailabilityStatus(baseMockMember), 'AVAILABLE');

// 4b. Overload member: isOverloaded true or > 80%
const overloadMember: MemberWorkload = {
  ...baseMockMember,
  fullName: 'Siti Rahma',
  activeTaskCount: 4,
  totalWeight: 22.0,
  capacityPercentage: 110,
  isOverloaded: true,
};
assert.equal(determineAvailabilityStatus(overloadMember), 'OVERLOAD');

// 4c. Normal member: 50% - 80% capacity
const normalMember: MemberWorkload = {
  ...baseMockMember,
  fullName: 'Joko Widodo',
  activeTaskCount: 3,
  totalWeight: 14.0,
  capacityPercentage: 70,
  isOverloaded: false,
};
assert.equal(determineAvailabilityStatus(normalMember), 'NORMAL');
console.log(
  '✔ Test 6 Passed: determineAvailabilityStatus correctly computes AVAILABLE, NORMAL, and OVERLOAD'
);

console.log('\n--- ALL AI RAG SPEC TESTS PASSED! ---');
