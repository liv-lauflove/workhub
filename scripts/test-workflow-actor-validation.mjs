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
      `Unexpected dependency in workflow actor test (${relative}): ${name}`
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

const teamA = 'b1510000-0000-4000-8000-000000000001';
const teamB = 'b1510000-0000-4000-8000-000000000002';
const projectA = 'd1510000-0000-4000-8000-000000000001';
const colTodo = 'e1510000-0000-4000-8000-000000000001';
const colInProgress = 'e1510000-0000-4000-8000-000000000002';
const colReview = 'e1510000-0000-4000-8000-000000000003';
const colDone = 'e1510000-0000-4000-8000-000000000004';

const taskId = 'f1510000-0000-4000-8000-000000000001';

const leaderA = {
  id: 'a1510000-0000-4000-8000-000000000001',
  role: 'leader',
  team_id: teamA,
};
const devA = {
  id: 'a1510000-0000-4000-8000-000000000002',
  role: 'member',
  team_id: teamA,
};
const testerA = {
  id: 'a1510000-0000-4000-8000-000000000003',
  role: 'member',
  team_id: teamA,
};
const otherMemberA = {
  id: 'a1510000-0000-4000-8000-000000000004',
  role: 'member',
  team_id: teamA,
};
const crossTeamMember = {
  id: 'a1510000-0000-4000-8000-000000000005',
  role: 'member',
  team_id: teamB,
};
const managementLeader = {
  id: 'a1510000-0000-4000-8000-000000000006',
  role: 'leader',
  team_id: MANAGEMENT_TEAM_ID,
};

const boardColumns = [
  { id: colTodo, name: 'To Do', project_id: projectA, position: 1 },
  { id: colInProgress, name: 'In Progress', project_id: projectA, position: 2 },
  { id: colReview, name: 'QA Review', project_id: projectA, position: 3 },
  { id: colDone, name: 'Done', project_id: projectA, position: 4 },
];

function createWorkflowFixture({
  actor = devA,
  task = {
    id: taskId,
    project_id: projectA,
    assignee_id: devA.id,
    developer_id: devA.id,
    tester_id: testerA.id,
    dev_status: 'dev_done',
    test_status: 'testing',
    column_id: colReview,
    project: { id: projectA, team_id: teamA },
  },
  subtasks = [],
  simulateStale = false,
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
          let orderClause = null;
          const chain = {
            eq(col, val) {
              filters[col] = val;
              return chain;
            },
            order(col, options) {
              orderClause = { col, options };
              return chain;
            },
            async maybeSingle() {
              if (table === 'tasks') {
                return { data: { ...task }, error: null };
              }
              if (table === 'profiles') {
                return { data: actor, error: null };
              }
              if (table === 'projects') {
                return { data: { id: projectA, team_id: teamA }, error: null };
              }
              return { data: null, error: null };
            },
            async single() {
              return chain.maybeSingle();
            },
            then(resolve, reject) {
              if (table === 'board_columns') {
                let cols = [...boardColumns];
                if (orderClause?.col === 'position') {
                  cols.sort((a, b) =>
                    orderClause.options?.ascending ? a.position - b.position : b.position - a.position
                  );
                }
                return Promise.resolve({ data: cols, error: null }).then(resolve, reject);
              }
              if (table === 'task_subtasks') {
                let filtered = [...subtasks];
                if (filters.is_completed !== undefined) {
                  filtered = filtered.filter(st => st.is_completed === filters.is_completed);
                }
                return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
              }
              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            },
          };
          return chain;
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
                  if (simulateStale) {
                    return { data: null, error: { message: 'PGRST116: JSON object requested, multiple (or no) rows returned' } };
                  }
                  if (filters.dev_status && filters.dev_status !== task.dev_status) {
                    return { data: null, error: { message: 'Precondition mismatch: dev_status' } };
                  }
                  if (filters.test_status && filters.test_status !== task.test_status) {
                    return { data: null, error: { message: 'Precondition mismatch: test_status' } };
                  }
                  writes.push({ table, op: 'update', payload, filters });
                  return {
                    data: {
                      id: taskId,
                      dev_status: payload.dev_status || task.dev_status,
                      test_status: payload.test_status || task.test_status,
                      test_notes: payload.test_notes ?? task.test_notes ?? null,
                      tester_id: payload.tester_id || task.tester_id,
                      github_branch: payload.github_branch || task.github_branch || null,
                      github_repo: task.github_repo || null,
                      column_id: payload.column_id || task.column_id,
                    },
                    error: null,
                  };
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
  const invitationUtils = loadSource('src/features/team/invitation-utils.ts', {});
  const teamQueries = loadSource('src/features/team/queries/team.queries.ts', {
    'server-only': {},
    '@/lib/supabase/server': server,
    '../constants': { MANAGEMENT_TEAM_ID },
    '../invitation-utils': invitationUtils,
  });

  const actions = loadSource('src/features/tasks/actions/task.actions.ts', {
    '@/lib/supabase/server': server,
    '@/lib/supabase/admin': {
      createAdminClient() {
        throw new Error('Task actions must not use admin client');
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

async function runWorkflowActorValidationTests() {
  console.log('--- Running Workflow Actor & QA Transition Regression Tests (Issue #151 / B01) ---');
  let checks = 0;

  // 1. updateTaskRoleAssigneeAction - separation of duties / anti-self-approval
  {
    // 1.1 Leader cannot assign developer as tester on the same task
    const f1 = createWorkflowFixture({
      actor: leaderA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: null,
        project: { team_id: teamA },
      },
    });
    const res1 = await f1.actions.updateTaskRoleAssigneeAction({
      taskId,
      role: 'tester',
      userId: devA.id,
      projectId: projectA,
    });
    assert.equal(res1.success, false);
    assert.match(res1.error._form[0], /anti-self-approval/i);
    assert.equal(f1.writes.length, 0);
    checks++;

    // 1.2 Leader cannot assign tester as developer on the same task
    const f2 = createWorkflowFixture({
      actor: leaderA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: null,
        tester_id: testerA.id,
        project: { team_id: teamA },
      },
    });
    const res2 = await f2.actions.updateTaskRoleAssigneeAction({
      taskId,
      role: 'developer',
      userId: testerA.id,
      projectId: projectA,
    });
    assert.equal(res2.success, false);
    assert.match(res2.error._form[0], /Tester QA tidak dapat ditugaskan sebagai developer/i);
    assert.equal(f2.writes.length, 0);
    checks++;
  }

  // 2. updateTaskDevStatusAction - actor authorization & auto testing transition
  {
    // 2.1 Unauthenticated actor fails
    const fUnauth = createWorkflowFixture({ actor: null });
    const resUnauth = await fUnauth.actions.updateTaskDevStatusAction({
      taskId,
      devStatus: 'dev_done',
    });
    assert.equal(resUnauth.success, false);
    assert.match(resUnauth.error._form[0], /Sesi login tidak valid/i);
    assert.equal(fUnauth.writes.length, 0);
    checks++;

    // 2.2 Unassigned member cannot update dev status
    const fUnassigned = createWorkflowFixture({ actor: otherMemberA });
    const resUnassigned = await fUnassigned.actions.updateTaskDevStatusAction({
      taskId,
      devStatus: 'in_progress',
    });
    assert.equal(resUnassigned.success, false);
    assert.match(resUnassigned.error._form[0], /Hanya developer yang ditugaskan/i);
    assert.equal(fUnassigned.writes.length, 0);
    checks++;

    // 2.2b Cross-team member cannot update dev status
    const fCrossTeam = createWorkflowFixture({ actor: crossTeamMember });
    const resCrossTeam = await fCrossTeam.actions.updateTaskDevStatusAction({
      taskId,
      devStatus: 'in_progress',
    });
    assert.equal(resCrossTeam.success, false);
    assert.match(resCrossTeam.error._form[0], /Hanya developer yang ditugaskan/i);
    assert.equal(fCrossTeam.writes.length, 0);
    checks++;

    // 2.3 Assigned developer can update dev status to dev_done (automatically sets test_status to testing)
    const fDev = createWorkflowFixture({
      actor: devA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'in_progress',
        test_status: 'pending',
        column_id: colInProgress,
        project: { id: projectA, team_id: teamA },
      },
    });
    const resDev = await fDev.actions.updateTaskDevStatusAction({
      taskId,
      devStatus: 'dev_done',
      projectId: projectA,
    });
    assert.equal(resDev.success, true);
    assert.equal(fDev.writes.length, 1);
    assert.equal(fDev.writes[0].payload.dev_status, 'dev_done');
    assert.equal(fDev.writes[0].payload.test_status, 'testing');
    checks++;

    // 2.4 Project leader can update dev status
    const fLeader = createWorkflowFixture({ actor: leaderA });
    const resLeader = await fLeader.actions.updateTaskDevStatusAction({
      taskId,
      devStatus: 'in_progress',
    });
    assert.equal(resLeader.success, true);
    assert.equal(fLeader.writes.length, 1);
    checks++;
  }

  // 3. openPullRequestAction - actor authorization & anti-self-approval on reviewer
  {
    // 3.1 Unassigned member cannot open PR
    const fUnassignedPR = createWorkflowFixture({ actor: otherMemberA });
    const resUnassignedPR = await fUnassignedPR.actions.openPullRequestAction({
      taskId,
      changelog: 'PR submit',
      reviewerId: testerA.id,
    });
    assert.equal(resUnassignedPR.success, false);
    assert.match(resUnassignedPR.error._form[0], /Hanya developer yang ditugaskan/i);
    assert.equal(fUnassignedPR.writes.length, 0);
    checks++;

    // 3.2 Developer cannot assign themselves as reviewer
    const fSelfReviewer = createWorkflowFixture({ actor: devA });
    const resSelfReviewer = await fSelfReviewer.actions.openPullRequestAction({
      taskId,
      changelog: 'PR attempt with self reviewer',
      reviewerId: devA.id,
    });
    assert.equal(resSelfReviewer.success, false);
    assert.match(resSelfReviewer.error._form[0], /anti-self-approval/i);
    assert.equal(fSelfReviewer.writes.length, 0);
    checks++;

    // 3.3 Developer cannot submit if task is already in passed status
    const fPassedTask = createWorkflowFixture({
      actor: devA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'passed',
        project: { id: projectA, team_id: teamA },
      },
    });
    const resPassed = await fPassedTask.actions.openPullRequestAction({
      taskId,
      changelog: 'Resubmit passed task',
      reviewerId: testerA.id,
    });
    assert.equal(resPassed.success, false);
    assert.match(resPassed.error._form[0], /Task telah disetujui \(Passed QA\)/i);
    assert.equal(fPassedTask.writes.length, 0);
    checks++;

    // 3.4 Valid developer submission sets dev_done, testing, and Review column
    const fValidPR = createWorkflowFixture({
      actor: devA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: null,
        dev_status: 'in_progress',
        test_status: 'pending',
        column_id: colInProgress,
        project: { id: projectA, team_id: teamA },
      },
    });
    const resValidPR = await fValidPR.actions.openPullRequestAction({
      taskId,
      title: 'Fix issue 151',
      changelog: 'Implements workflow security guards',
      reviewerId: testerA.id,
      projectId: projectA,
    });
    assert.equal(resValidPR.success, true);
    assert.equal(fValidPR.writes.length, 1);
    assert.equal(fValidPR.writes[0].payload.dev_status, 'dev_done');
    assert.equal(fValidPR.writes[0].payload.test_status, 'testing');
    assert.equal(fValidPR.writes[0].payload.tester_id, testerA.id);
    assert.equal(fValidPR.writes[0].payload.column_id, colReview);
    checks++;
  }

  // 4. updateTaskTestStatusAction - actor validation, checklist prerequisite, anti-self-approval
  {
    // 4.1 Developer cannot mark test status as passed (anti-self-approval)
    const fDevPassed = createWorkflowFixture({
      actor: devA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
    });
    const resDevPassed = await fDevPassed.actions.updateTaskTestStatusAction({
      taskId,
      testStatus: 'passed',
    });
    assert.equal(resDevPassed.success, false);
    assert.match(resDevPassed.error._form[0], /Developer tidak dapat menandai pengujian passed/i);
    assert.equal(fDevPassed.writes.length, 0);
    checks++;

    // 4.2 Tester cannot mark passed if dev_status is not dev_done
    const fNotDone = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'in_progress',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
    });
    const resNotDone = await fNotDone.actions.updateTaskTestStatusAction({
      taskId,
      testStatus: 'passed',
    });
    assert.equal(resNotDone.success, false);
    assert.match(resNotDone.error._form[0], /Status development harus selesai \(dev_done\)/i);
    assert.equal(fNotDone.writes.length, 0);
    checks++;

    // 4.3 Tester cannot mark passed if test_status is not testing
    const fNotTesting = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'pending',
        project: { id: projectA, team_id: teamA },
      },
    });
    const resNotTesting = await fNotTesting.actions.updateTaskTestStatusAction({
      taskId,
      testStatus: 'passed',
    });
    assert.equal(resNotTesting.success, false);
    assert.match(resNotTesting.error._form[0], /Task harus berada dalam status pengujian \(testing\)/i);
    assert.equal(fNotTesting.writes.length, 0);
    checks++;

    // 4.4 Tester cannot mark passed if incomplete subtasks exist
    const fIncompleteSubtasks = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
      subtasks: [
        { id: 'st-1', task_id: taskId, is_completed: true },
        { id: 'st-2', task_id: taskId, is_completed: false },
      ],
    });
    const resIncomplete = await fIncompleteSubtasks.actions.updateTaskTestStatusAction({
      taskId,
      testStatus: 'passed',
    });
    assert.equal(resIncomplete.success, false);
    assert.match(resIncomplete.error._form[0], /Seluruh checklist subtask pengujian wajib diselesaikan/i);
    assert.equal(fIncompleteSubtasks.writes.length, 0);
    checks++;

    // 4.5 Authorized tester marks passed when all subtasks completed
    const fAllCompleted = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
      subtasks: [
        { id: 'st-1', task_id: taskId, is_completed: true },
        { id: 'st-2', task_id: taskId, is_completed: true },
      ],
    });
    const resAllCompleted = await fAllCompleted.actions.updateTaskTestStatusAction({
      taskId,
      testStatus: 'passed',
      testNotes: 'QA verification passed completely',
    });
    assert.equal(resAllCompleted.success, true);
    assert.equal(fAllCompleted.writes.length, 1);
    assert.equal(fAllCompleted.writes[0].payload.test_status, 'passed');
    checks++;
  }

  // 5. requestChangesAction - actor authorization & state transitions
  {
    // 5.1 Developer cannot call request changes on their own task
    const fDevReqChanges = createWorkflowFixture({ actor: devA });
    const resDevReq = await fDevReqChanges.actions.requestChangesAction({
      taskId,
      notes: 'Needs more test cases',
    });
    assert.equal(resDevReq.success, false);
    assert.match(resDevReq.error._form[0], /Developer tidak dapat melakukan request changes/i);
    assert.equal(fDevReqChanges.writes.length, 0);
    checks++;

    // 5.2 Authorized tester requests changes, reverting dev to in_progress and test to failed
    const fTesterReq = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        column_id: colReview,
        project: { id: projectA, team_id: teamA },
      },
    });
    const resTesterReq = await fTesterReq.actions.requestChangesAction({
      taskId,
      notes: 'Missing validation for edge cases',
      projectId: projectA,
    });
    assert.equal(resTesterReq.success, true);
    assert.equal(fTesterReq.writes.length, 1);
    assert.equal(fTesterReq.writes[0].payload.dev_status, 'in_progress');
    assert.equal(fTesterReq.writes[0].payload.test_status, 'failed');
    assert.equal(fTesterReq.writes[0].payload.column_id, colInProgress);
    checks++;
  }

  // 6. mergePullRequestAction - anti-self-approval, checklist, and atomic conditional update
  {
    // 6.1 Developer cannot merge their own PR
    const fDevMerge = createWorkflowFixture({
      actor: devA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
    });
    const resDevMerge = await fDevMerge.actions.mergePullRequestAction({ taskId });
    assert.equal(resDevMerge.success, false);
    assert.match(resDevMerge.error._form[0], /anti-self-approval/i);
    assert.equal(fDevMerge.writes.length, 0);
    checks++;

    // 6.2 Merge rejected if incomplete subtasks exist
    const fMergeIncomplete = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
      subtasks: [{ id: 'st-1', task_id: taskId, is_completed: false }],
    });
    const resMergeIncomplete = await fMergeIncomplete.actions.mergePullRequestAction({ taskId });
    assert.equal(resMergeIncomplete.success, false);
    assert.match(resMergeIncomplete.error._form[0], /Seluruh checklist subtask pengujian wajib diselesaikan/i);
    assert.equal(fMergeIncomplete.writes.length, 0);
    checks++;

    // 6.3 Stale / concurrent update rejected by atomic condition
    const fStaleMerge = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        project: { id: projectA, team_id: teamA },
      },
      subtasks: [{ id: 'st-1', task_id: taskId, is_completed: true }],
      simulateStale: true,
    });
    const resStaleMerge = await fStaleMerge.actions.mergePullRequestAction({ taskId });
    assert.equal(resStaleMerge.success, false);
    assert.match(resStaleMerge.error._form[0], /Status task telah berubah atau tidak memenuhi prasyarat/i);
    assert.equal(fStaleMerge.writes.length, 0);
    checks++;

    // 6.4 Valid merge by authorized tester transitions to dev_done, passed, and Done column
    const fValidMerge = createWorkflowFixture({
      actor: testerA,
      task: {
        id: taskId,
        project_id: projectA,
        developer_id: devA.id,
        tester_id: testerA.id,
        dev_status: 'dev_done',
        test_status: 'testing',
        column_id: colReview,
        project: { id: projectA, team_id: teamA },
      },
      subtasks: [{ id: 'st-1', task_id: taskId, is_completed: true }],
    });
    const resValidMerge = await fValidMerge.actions.mergePullRequestAction({
      taskId,
      notes: 'LGTM! Merged after QA verification.',
      projectId: projectA,
    });
    assert.equal(resValidMerge.success, true);
    assert.equal(fValidMerge.writes.length, 1);
    assert.equal(fValidMerge.writes[0].payload.dev_status, 'dev_done');
    assert.equal(fValidMerge.writes[0].payload.test_status, 'passed');
    assert.equal(fValidMerge.writes[0].payload.column_id, colDone);
    checks++;

    // 6.5 Project Leader and Management can merge PR as authorized reviewers
    for (const authActor of [leaderA, managementLeader]) {
      const fAuthMerge = createWorkflowFixture({
        actor: authActor,
        task: {
          id: taskId,
          project_id: projectA,
          developer_id: devA.id,
          tester_id: testerA.id,
          dev_status: 'dev_done',
          test_status: 'testing',
          column_id: colReview,
          project: { id: projectA, team_id: teamA },
        },
        subtasks: [{ id: 'st-1', task_id: taskId, is_completed: true }],
      });
      const resAuth = await fAuthMerge.actions.mergePullRequestAction({
        taskId,
        notes: 'Merged by leadership review.',
        projectId: projectA,
      });
      assert.equal(resAuth.success, true);
      assert.equal(fAuthMerge.writes.length, 1);
      assert.equal(fAuthMerge.writes[0].payload.column_id, colDone);
      checks++;
    }
  }

  console.log(`✓ All ${checks} Workflow Actor Validation & QA Transition checks PASSED successfully!`);
}

runWorkflowActorValidationTests().catch((err) => {
  console.error('Workflow actor validation regression suite FAILED:', err);
  process.exit(1);
});
