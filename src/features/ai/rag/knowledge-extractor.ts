/**
 * Knowledge Base Retriever & Context Extractor for Workhub RAG (Issue #97).
 * Analyzes incoming user prompts, classifies intent, and retrieves relevant
 * schema definitions and internal workflow rules to inject into LLM system context.
 *
 * Enforces schema-only access with zero direct raw table reads by the LLM.
 */

import {
  searchSchemaDictionary,
  getSchemaDictionaryString,
} from './schema-dictionary';
import { searchWorkflowRules, getWorkflowRulesString } from './workflow-rules';

export type RagQueryCategory =
  'schema' | 'workflow' | 'workload' | 'branch' | 'general';

export interface RagContextResult {
  category: RagQueryCategory;
  retrievedContext: string;
  matchedSections: string[];
  requiresWorkloadContext: boolean;
}

/**
 * Classifies query intent based on keywords to selectively retrieve relevant knowledge chunks.
 */
export function classifyRagIntent(query: string): {
  category: RagQueryCategory;
  requiresWorkload: boolean;
} {
  const lower = query.toLowerCase();

  // Workload / Member capacity keywords
  const workloadKeywords = [
    'available',
    'tersedia',
    'beban',
    'workload',
    'kapasitas',
    'capacity',
    'overload',
    'siapa yang bisa',
    'kasih task',
    'assign task',
    'alokasi',
    'member mana',
    'anggota mana',
    'siapa kosong',
    'burnout',
  ];

  // Schema / Database keywords
  const schemaKeywords = [
    'schema',
    'skema',
    'tabel',
    'table',
    'kolom',
    'column',
    'database',
    'ddl',
    'foreign key',
    'primary key',
    'relasi',
    'relation',
  ];

  // Workflow / SOP / Testing keywords
  const workflowKeywords = [
    'alur',
    'workflow',
    'testing',
    'tester',
    'qa',
    'dev',
    'developer',
    'dual-assignee',
    'subtask',
    'done',
    '100%',
    'selesai',
    'kanban',
    'in progress',
    'backlog',
    'branch',
    'git',
    'sop',
  ];

  const hasWorkload = workloadKeywords.some((kw) => lower.includes(kw));
  const hasSchema = schemaKeywords.some((kw) => lower.includes(kw));
  const hasWorkflow = workflowKeywords.some((kw) => lower.includes(kw));

  if (hasWorkload) {
    return { category: 'workload', requiresWorkload: true };
  }
  if (hasSchema && !hasWorkflow) {
    return { category: 'schema', requiresWorkload: false };
  }
  if (hasWorkflow) {
    return { category: 'workflow', requiresWorkload: false };
  }

  return { category: 'general', requiresWorkload: false };
}

/**
 * Retrieves the most targeted knowledge base text corresponding to the user query.
 */
export function retrieveRelevantKnowledge(query: string): RagContextResult {
  const { category, requiresWorkload } = classifyRagIntent(query);
  const matchedSections: string[] = [];
  const contextParts: string[] = [];

  if (category === 'schema') {
    const schemaDoc = searchSchemaDictionary(query);
    contextParts.push(schemaDoc);
    matchedSections.push('schema-dictionary');
  } else if (category === 'workflow') {
    const workflowDoc = searchWorkflowRules(query);
    contextParts.push(workflowDoc);
    matchedSections.push('workflow-rules');
  } else if (category === 'workload') {
    // For workload queries, include both the 20-point capacity workflow policy and task schema
    const workflowDoc = searchWorkflowRules('workload capacity points');
    contextParts.push(workflowDoc);
    matchedSections.push('workflow-rules:capacity');

    const schemaSnippet = searchSchemaDictionary(
      'tasks profiles capacity_settings'
    );
    contextParts.push(schemaSnippet);
    matchedSections.push('schema:tasks-profiles');
  } else {
    // General engineering queries: provide concise overview of workflow and schema
    contextParts.push(getWorkflowRulesString());
    contextParts.push(getSchemaDictionaryString());
    matchedSections.push('all-workflow', 'all-schema');
  }

  return {
    category,
    retrievedContext: contextParts.join('\n\n---\n\n'),
    matchedSections,
    requiresWorkloadContext: requiresWorkload,
  };
}

/**
 * Builds a formatted Knowledge Base header ready to be appended to the AI System Prompt.
 */
export function buildRagPromptHeader(query: string): string {
  const result = retrieveRelevantKnowledge(query);

  return `\n\n[INTERNAL KNOWLEDGE BASE (RAG - SCHEMA & WORKFLOW)]:
Use the following internal documentation to formulate accurate, policy-aligned responses:
Category: ${result.category.toUpperCase()}

${result.retrievedContext}

Important Guardrails:
1. Ground your answers strictly in the documented schema and workflow policies above.
2. If asked about table structures, refer only to the verified schema dictionary above. Never hallucinate non-existent tables or columns.
3. If asked about task completion, uphold the rule that a task is only 100% complete when BOTH Development and Testing are done.`;
}
