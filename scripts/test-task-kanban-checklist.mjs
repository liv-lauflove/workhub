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
    throw new Error(
      `Unexpected dependency in task/kanban/checklist test (${relative}): ${name}`
    );
  };
  new Function('require', 'module', 'exports', output)(
    requireSource,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}

const { MANAGEMENT_TEAM_ID } = loadSource('src/features/team/constants.ts');
const taskSchemaModule = loadSource('src/features/tasks/schemas/task.schema.ts');

const teamA = 'b1460000-0000-4000-8000-000000000001';
const teamB = 'b1460000-0000-4000-8000-000000000002';
const projectA = 'd1460000-0000-4000-8000-000000000001';
const projectB = 'd1460000-0000-4000-8000-000000000002';
const colA = 'e1460000-0000-4000-8000-000000000001';
const colB = 'e1460000-0000-4000-8000-000000000005';
const taskId = 'f1460000-0000-4000-8000-000000000001';
const subtaskId = '01460000-0000-4000-8000-000000000001';
const leaderA = {
  id: 'a1460000-0000-4000-8000-000000000001',
  role: 'leader',
  team_id: teamA,
};
const memberA = {
  id: 'a1460000-0000-4000-8000-000000000002',
  role: 'member',
  team_id: teamA,
};
const testerA = {
  id: 'a1460000-0000-4000-8000-000000000003',
  role: 'member',
  team_id: teamA,
};
const leaderB = {
  id: 'a1460000-0000-4000-8000-000000000005',
  role: 'leader',
  team_id: teamB,
};
const managementLeader = {
  id: 'a1460000-0000-4000-8000-000000000006',
  role: 'leader',
  team_id: MANAGEMENT_TEAM_ID,
};
const managementMember = {
  id: 'a1460000-0000-4000-8000-000000000007',
  role: 'member',
  team_id: MANAGEMENT_TEAM_ID,
};

function createTaskFixture({
  actor = leaderA,
  projectRow = { id: projectA, team_id: teamA },
  columnRow = { id: colA, project_id: projectA },
  taskRow = { id: taskId, project_id: projectA, project: { team_id: teamA } },
  insertResponse = {
    data: { id: taskId, title: 'Valid Task', project_id: projectA },
    error: null,
  },
  updateResponse = {
    data: {
      id: taskId,
      assignee_id: memberA.id,
      developer_id: memberA.id,
      tester_id: testerA.id,
      is_completed: true,
      tested_by: actor?.id ?? null,
      tested_at: '2026-11-12T00:00:00.000Z',
    },
    error: null,
  },
  deleteSubtaskResponse = {
    data: { id: subtaskId },
    error: null,
  },
} = {}) {
  const writes = [];
  const revalidated = [];

  const client = {
    auth: {
      async getUser() {
        return actor
          ? { data: { user: { id: actor.id } }, error: null }
          : { data: { user: null }, error: { message: 'Unauthenticated' } };
      },
    },
    from(table) {
      return {
        select() {
          const filters = {};
          const chain = {
            eq(col, val) {
              filters[col] = val;
              return chain;
            },
            order() {
              return chain;
            },
            limit() {
              return Promise.resolve({ data: [{ sort_order: 1 }], error: null });
            },
            async maybeSingle() {
              if (table === 'projects') return { data: projectRow, error: null };
              if (table === 'profiles') return { data: actor, error: null };
              if (table === 'board_columns')
                return { data: columnRow, error: null };
              if (table === 'tasks') return { data: taskRow, error: null };
              return { data: null, error: null };
            },
            async single() {
              return chain.maybeSingle();
            },
          };
          return chain;
        },
        insert(payload) {
          writes.push({ table, op: 'insert', payload });
          return {
            select() {
              return {
                async single() {
                  return insertResponse;
                },
              };
            },
          };
        },
        update(payload) {
          const filters = {};
          const chain = {
            eq(col, val) {
              filters[col] = val;
              return chain;
            },
            select() {
              return {
                async single() {
                  writes.push({ table, op: 'update', payload, filters });
                  return updateResponse;
                },
              };
            },
          };
          return chain;
        },
        delete() {
          const filters = {};
          const chain = {
            eq(col, val) {
              filters[col] = val;
              return chain;
            },
            select() {
              return {
                async maybeSingle() {
                  writes.push({ table, op: 'delete', filters });
                  return deleteSubtaskResponse;
                },
              };
            },
          };
          return chain;
        },
      };
    },
  };

  const server = { createClient: async () => client };
  const teamQueries = loadSource('src/features/team/queries/team.queries.ts', {
    'server-only': {},
    '@/lib/supabase/server': server,
    '../constants': { MANAGEMENT_TEAM_ID },
  });

  const actions = loadSource('src/features/tasks/actions/task.actions.ts', {
    '@/lib/supabase/server': server,
    '@/lib/supabase/admin': {
      createAdminClient() {
        throw new Error('Task/checklist actions must not use admin client');
      },
    },
    'next/cache': { revalidatePath: (route) => revalidated.push(route) },
    '../schemas/task.schema': taskSchemaModule,
    '@/lib/storage': {
      ATTACHMENTS_BUCKET: 'task-attachments',
      generateAttachmentStoragePath: () => '',
      validateTaskAttachmentFile: () => ({ valid: true }),
    },
    '@/features/ai/lib/task-prioritizing': {
      detectPriorityOverride: () => false,
      parseDurationToHours: () => null,
    },
    '@/features/ai/queries/ai-analytics.queries': {
      recordAiSuggestionOverride: async () => {},
    },
    '@/features/github/lib/webhook-verifier': {
      normalizeGithubRepository: (v) => v,
    },
    '@/features/team/queries/team.queries': teamQueries,
  });

  return { actions, writes, revalidated };
}

let checks = 0;

// 1. Unauthorized actors cannot create tasks
for (const actor of [null, memberA, managementMember, leaderB]) {
  const f = createTaskFixture({ actor });
  const res = await f.actions.createTaskAction(null, {
    title: 'Unauthorized Task',
    projectId: projectA,
    columnId: colA,
    priority: 'medium',
    origin: 'normal',
  });
  assert.equal(res.success, false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.revalidated.length, 0);
  checks++;
}

// 2. Leader cannot create task with a Kanban column belonging to another project
{
  const f = createTaskFixture({
    actor: leaderA,
    columnRow: { id: colB, project_id: projectB },
  });
  const res = await f.actions.createTaskAction(null, {
    title: 'Mismatched Column Task',
    projectId: projectA,
    columnId: colB,
    priority: 'medium',
    origin: 'normal',
  });
  assert.equal(res.success, false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.revalidated.length, 0);
  checks++;
}

// 3. Project Leader and Management Leader can create valid tasks
for (const actor of [leaderA, managementLeader]) {
  const f = createTaskFixture({ actor });
  const res = await f.actions.createTaskAction(null, {
    title: 'Valid Task',
    projectId: projectA,
    columnId: colA,
    priority: 'high',
    origin: 'normal',
    assigneeId: memberA.id,
  });
  assert.equal(res.success, true);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].table, 'tasks');
  assert.equal(f.writes[0].op, 'insert');
  assert.equal(f.writes[0].payload.created_by, actor.id);
  assert.deepEqual(f.revalidated, [`/projects/${projectA}`, '/tasks', '/projects']);
  checks++;
}

// 4. Unauthorized actors cannot change task assignees (PIC, Developer, Tester)
for (const actor of [null, memberA, testerA, managementMember, leaderB]) {
  const f1 = createTaskFixture({ actor });
  const res1 = await f1.actions.updateTaskAssigneeAction({
    taskId,
    assigneeId: memberA.id,
    projectId: projectA,
  });
  assert.equal(res1.success, false);
  assert.equal(f1.writes.length, 0);
  assert.equal(f1.revalidated.length, 0);
  checks++;

  for (const role of ['developer', 'tester']) {
    const f2 = createTaskFixture({ actor });
    const res2 = await f2.actions.updateTaskRoleAssigneeAction({
      taskId,
      role,
      userId: memberA.id,
      projectId: projectA,
    });
    assert.equal(res2.success, false);
    assert.equal(f2.writes.length, 0);
    assert.equal(f2.revalidated.length, 0);
    checks++;
  }
}

// 5. Project Leader and Management Leader can update task assignees
for (const actor of [leaderA, managementLeader]) {
  const f1 = createTaskFixture({ actor });
  const res1 = await f1.actions.updateTaskAssigneeAction({
    taskId,
    assigneeId: memberA.id,
    projectId: projectA,
  });
  assert.equal(res1.success, true);
  assert.equal(f1.writes.length, 1);
  assert.equal(f1.writes[0].payload.assignee_id, memberA.id);
  checks++;

  for (const role of ['developer', 'tester']) {
    const f2 = createTaskFixture({ actor });
    const targetUserId = role === 'developer' ? memberA.id : testerA.id;
    const res2 = await f2.actions.updateTaskRoleAssigneeAction({
      taskId,
      role,
      userId: targetUserId,
      projectId: projectA,
    });
    assert.equal(res2.success, true);
    assert.equal(f2.writes.length, 1);
    assert.equal(
      f2.writes[0].payload[role === 'developer' ? 'developer_id' : 'tester_id'],
      targetUserId
    );
    checks++;
  }
}

// 6. Subtask toggle stamps authentic actor ID and delete fails when RLS returns 0 rows
{
  const fToggle = createTaskFixture({ actor: testerA });
  const resToggle = await fToggle.actions.toggleTaskSubtaskAction({
    subtaskId,
    taskId,
    isCompleted: true,
    projectId: projectA,
  });
  assert.equal(resToggle.success, true);
  assert.equal(fToggle.writes.length, 1);
  assert.equal(fToggle.writes[0].payload.is_completed, true);
  assert.equal(fToggle.writes[0].payload.tested_by, testerA.id);
  assert.equal(typeof fToggle.writes[0].payload.tested_at, 'string');
  checks++;

  const fDeleteDenied = createTaskFixture({
    actor: memberA,
    deleteSubtaskResponse: { data: null, error: null },
  });
  const resDeleteDenied = await fDeleteDenied.actions.deleteTaskSubtaskAction({
    subtaskId,
    taskId,
    projectId: projectA,
  });
  assert.equal(resDeleteDenied.success, false);
  assert.equal(fDeleteDenied.revalidated.length, 0);
  checks++;

  const fDeleteAllowed = createTaskFixture({
    actor: testerA,
    deleteSubtaskResponse: { data: { id: subtaskId }, error: null },
  });
  const resDeleteAllowed = await fDeleteAllowed.actions.deleteTaskSubtaskAction({
    subtaskId,
    taskId,
    projectId: projectA,
  });
  assert.equal(resDeleteAllowed.success, true);
  assert.deepEqual(fDeleteAllowed.revalidated, [
    `/projects/${projectA}`,
    `/tasks/${taskId}`,
  ]);
  checks++;
}

// 7. Static guard checks on migration and project page
{
  const projectPageSource = fs.readFileSync(
    path.join(root, 'src/app/(dashboard)/projects/[id]/page.tsx'),
    'utf8'
  );
  assert.match(
    projectPageSource,
    /const\s+canCreateTask\s*=\s*isLeader\s*&&/,
    'Project page must gate canCreateTask on isLeader'
  );
  checks++;
}

console.log(
  `Task, Kanban, and Checklist action regression checks passed: ${checks}`
);
