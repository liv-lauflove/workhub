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
    if (name.startsWith('node:')) return createRequire(import.meta.url)(name);
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), name);
      const targetTs = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies);
      }
    }
    if (name.startsWith('@/')) {
      const target = path.join(root, name.replace(/^@\//, 'src/'));
      const targetTs = target.endsWith('.ts') ? target : `${target}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies);
      }
    }
    throw new Error(
      `Unexpected dependency in task attachments test (${relative}): ${name}`
    );
  };
  new Function('require', 'module', 'exports', output)(
    requireSource,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}

const teamA = 'b1470000-0000-4000-8000-000000000001';
const teamB = 'b1470000-0000-4000-8000-000000000002';
const teamMgmt = 'b1470000-0000-4000-8000-000000000003';

const projectA = 'c1470000-0000-4000-8000-000000000001';
const projectB = 'c1470000-0000-4000-8000-000000000002';

const taskA = 'd1470000-0000-4000-8000-000000000001';
const taskB = 'd1470000-0000-4000-8000-000000000002';

const attA = 'e1470000-0000-4000-8000-000000000001';
const attB = 'e1470000-0000-4000-8000-000000000002';

const userALeader = {
  id: 'a1470000-0000-4000-8000-000000000001',
  role: 'leader',
  team_id: teamA,
  teams: { name: 'Alpha Squad' },
};

const userAUploader = {
  id: 'a1470000-0000-4000-8000-000000000002',
  role: 'member',
  team_id: teamA,
  teams: { name: 'Alpha Squad' },
};

const userAOther = {
  id: 'a1470000-0000-4000-8000-000000000003',
  role: 'member',
  team_id: teamA,
  teams: { name: 'Alpha Squad' },
};

const userBMember = {
  id: 'a1470000-0000-4000-8000-000000000004',
  role: 'member',
  team_id: teamB,
  teams: { name: 'Beta Squad' },
};

const userMgmt = {
  id: 'a1470000-0000-4000-8000-000000000005',
  role: 'leader',
  team_id: teamMgmt,
  teams: { name: 'Management' },
};

function createMockSupabase(currentUser, state) {
  const calls = {
    storageRemoves: [],
    storageUploads: [],
    signedUrls: [],
    inserts: [],
    deletes: [],
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: currentUser ? { id: currentUser.id } : null },
        error: currentUser ? null : new Error('No user session'),
      }),
    },
    storage: {
      from: () => ({
        upload: async (storagePath, file) => {
          calls.storageUploads.push({ storagePath, file });
          return { data: { path: storagePath }, error: null };
        },
        remove: async (paths) => {
          calls.storageRemoves.push(paths);
          return { data: paths, error: null };
        },
        createSignedUrl: async (storagePath, expiresIn) => {
          calls.signedUrls.push({ storagePath, expiresIn });
          return {
            data: { signedUrl: `https://example.com/signed/${storagePath}` },
            error: null,
          };
        },
      }),
    },
    from: (tableName) => {
      let filters = [];
      let insertPayload = null;
      let deleteMode = false;

      const builder = {
        select: () => {
          return builder;
        },
        insert: (payload) => {
          insertPayload = payload;
          calls.inserts.push({ table: tableName, payload });
          return builder;
        },
        delete: () => {
          deleteMode = true;
          return builder;
        },
        eq: (col, val) => {
          filters.push({ col, val });
          return builder;
        },
        maybeSingle: async () => {
          return executeSingle();
        },
        single: async () => {
          return executeSingle();
        },
      };

      const executeSingle = () => {
        if (tableName === 'tasks') {
          const idFilter = filters.find((f) => f.col === 'id')?.val;
          const task = state.tasks.find((t) => t.id === idFilter);
          if (!task) return { data: null, error: null };
          return {
            data: {
              ...task,
              projects: state.projects.find((p) => p.id === task.project_id) || null,
            },
            error: null,
          };
        }

        if (tableName === 'profiles') {
          const idFilter = filters.find((f) => f.col === 'id')?.val;
          const profile = state.profiles.find((p) => p.id === idFilter);
          if (!profile) return { data: null, error: null };
          return { data: profile, error: null };
        }

        if (tableName === 'task_attachments') {
          if (insertPayload) {
            const newRecord = {
              id: 'att-generated-uuid',
              ...insertPayload,
              created_at: new Date().toISOString(),
              uploader: {
                id: insertPayload.uploaded_by,
                full_name: 'Test Uploader',
                avatar_url: null,
              },
            };
            state.attachments.push(newRecord);
            return { data: newRecord, error: null };
          }

          const idFilter = filters.find((f) => f.col === 'id')?.val;
          const urlFilter = filters.find((f) => f.col === 'file_url')?.val;

          let record = null;
          if (idFilter) {
            record = state.attachments.find((a) => a.id === idFilter);
          } else if (urlFilter) {
            record = state.attachments.find((a) => a.file_url === urlFilter);
          }

          if (!record) return { data: null, error: null };

          const task = state.tasks.find((t) => t.id === record.task_id);
          const project = task
            ? state.projects.find((p) => p.id === task.project_id)
            : null;

          return {
            data: {
              ...record,
              tasks: task ? { ...task, projects: project } : null,
            },
            error: null,
          };
        }

        return { data: null, error: null };
      };

      builder.then = (resolve) => {
        if (deleteMode && tableName === 'task_attachments') {
          const idFilter = filters.find((f) => f.col === 'id')?.val;
          calls.deletes.push({ table: tableName, id: idFilter });
          state.attachments = state.attachments.filter((a) => a.id !== idFilter);
          resolve({ error: null });
          return;
        }
        resolve({ data: null, error: null });
      };

      return builder;
    },
  };

  return { client, calls };
}

function getInitialState() {
  return {
    projects: [
      { id: projectA, team_id: teamA, name: 'Project Alpha' },
      { id: projectB, team_id: teamB, name: 'Project Beta' },
    ],
    tasks: [
      {
        id: taskA,
        project_id: projectA,
        assignee_id: userAUploader.id,
        developer_id: userAUploader.id,
        tester_id: userAOther.id,
      },
      {
        id: taskB,
        project_id: projectB,
        assignee_id: userBMember.id,
        developer_id: userBMember.id,
        tester_id: userBMember.id,
      },
    ],
    profiles: [userALeader, userAUploader, userAOther, userBMember, userMgmt],
    attachments: [
      {
        id: attA,
        task_id: taskA,
        uploaded_by: userAUploader.id,
        file_name: 'spec.pdf',
        file_url: `tasks/${taskA}/1700000000-spec.pdf`,
        file_size: 102400,
        file_type: 'application/pdf',
      },
      {
        id: attB,
        task_id: taskB,
        uploaded_by: userBMember.id,
        file_name: 'secret-beta.png',
        file_url: `tasks/${taskB}/1700000000-secret-beta.png`,
        file_size: 204800,
        file_type: 'image/png',
      },
    ],
  };
}

function loadAction(currentUser, state) {
  const { client, calls } = createMockSupabase(currentUser, state);
  const actions = loadSource('src/features/tasks/actions/task.actions.ts', {
    'server-only': {},
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': {
      createClient: async () => client,
    },
    '@/lib/supabase/admin': {
      createAdminClient: () => client,
    },
    '@/features/auth/queries/auth.queries': {
      getUserProfile: async () => currentUser,
    },
    '@/features/tasks/queries/task.queries': {
      canUserMoveToDone: async () => true,
    },
    '@/features/projects/queries/project.queries': {
      isUserManagement: async (id) => id === userMgmt.id,
    },
  });

  return { actions, calls };
}

async function runTests() {
  console.log('--- Running Task Attachments Object Authorization Regression Suite ---');

  // Test 1: Upload by project team member succeeds
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userAUploader, state);
    const fd = new FormData();
    fd.append(
      'file',
      new File([new Uint8Array(100)], 'document.pdf', {
        type: 'application/pdf',
      })
    );
    fd.append('taskId', taskA);

    const res = await actions.uploadTaskAttachmentAction(fd);
    assert.equal(res.success, true, 'Team member upload should succeed');
    assert.equal(calls.storageUploads.length, 1, 'File should be uploaded to storage');
    assert.equal(calls.inserts.length, 1, 'Metadata should be inserted');
    console.log('✓ 1. Upload by project team member succeeds');
  }

  // Test 2: Upload by cross-team member is strictly rejected
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userBMember, state);
    const fd = new FormData();
    fd.append(
      'file',
      new File([new Uint8Array(100)], 'exploit.pdf', {
        type: 'application/pdf',
      })
    );
    fd.append('taskId', taskA);

    const res = await actions.uploadTaskAttachmentAction(fd);
    assert.equal(res.success, false, 'Cross-team upload should fail');
    assert.match(
      res.error._form[0],
      /tidak memiliki izin/i,
      'Error message should indicate permission denied'
    );
    assert.equal(calls.storageUploads.length, 0, 'No storage call made');
    assert.equal(calls.inserts.length, 0, 'No DB insert made');
    console.log('✓ 2. Upload by cross-team member is rejected without storage/db calls');
  }

  // Test 3: Record metadata with mismatched storage path is rejected
  {
    const state = getInitialState();
    const { actions } = loadAction(userAUploader, state);
    const res = await actions.recordTaskAttachmentAction({
      taskId: taskA,
      fileName: 'mismatched.pdf',
      fileUrl: `tasks/${taskB}/forged.pdf`, // Path targeting task B!
      fileSize: 1024,
      fileType: 'application/pdf',
    });

    assert.equal(res.success, false, 'Mismatched storage path should fail');
    assert.match(
      res.error._form[0],
      /tidak sesuai dengan ID task tujuan/i,
      'Error message should enforce task path prefix'
    );
    console.log('✓ 3. Record metadata with forged cross-task storage path is rejected');
  }

  // Test 4: Record metadata exceeding 5MB is rejected
  {
    const state = getInitialState();
    const { actions } = loadAction(userAUploader, state);
    const res = await actions.recordTaskAttachmentAction({
      taskId: taskA,
      fileName: 'oversized.pdf',
      fileUrl: `tasks/${taskA}/123-oversized.pdf`,
      fileSize: 6 * 1024 * 1024, // 6MB
      fileType: 'application/pdf',
    });

    assert.equal(res.success, false, 'Oversized file metadata should fail');
    assert.match(
      res.error._form[0],
      /melebihi batas maksimum 5 MB/i,
      'Error message should enforce 5MB limit'
    );
    console.log('✓ 4. Record metadata exceeding 5MB is rejected');
  }

  // Test 5: Delete attachment - authoritative DB lookup prevents object-swap / storage deletion attack
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userAUploader, state);

    // Attacker passes legitimate attachmentId (attA), but passes victim's fileUrl (attB path)!
    const res = await actions.deleteTaskAttachmentAction({
      attachmentId: attA,
      taskId: taskA,
      fileUrl: `tasks/${taskB}/victim-file.pdf`, // FORGED fileUrl
    });

    assert.equal(res.success, true, 'Legitimate delete by uploader succeeds');
    assert.equal(calls.storageRemoves.length, 1);
    // CRITICAL: Storage remove must use path from DB (attA's path), NOT client's forged path!
    assert.deepEqual(
      calls.storageRemoves[0],
      [`tasks/${taskA}/1700000000-spec.pdf`],
      'Storage remove MUST strictly use canonical database path, ignoring forged client fileUrl'
    );
    console.log('✓ 5. Delete attachment strictly uses canonical database path, ignoring forged client fileUrl');
  }

  // Test 6: Delete attachment - non-uploader member cannot delete
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userAOther, state);
    const res = await actions.deleteTaskAttachmentAction({
      attachmentId: attA,
      taskId: taskA,
    });

    assert.equal(res.success, false, 'Non-uploader member cannot delete');
    assert.match(res.error._form[0], /tidak memiliki izin/i);
    assert.equal(calls.storageRemoves.length, 0, 'No storage deletion occurred');
    console.log('✓ 6. Delete attachment by non-uploader team member is rejected');
  }

  // Test 7: Delete attachment - squad leader can delete
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userALeader, state);
    const res = await actions.deleteTaskAttachmentAction({
      attachmentId: attA,
    });

    assert.equal(res.success, true, 'Squad leader can delete team attachment');
    assert.equal(calls.storageRemoves.length, 1);
    console.log('✓ 7. Delete attachment by squad leader succeeds');
  }

  // Test 8: Delete attachment - Management user can delete
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userMgmt, state);
    const res = await actions.deleteTaskAttachmentAction({
      attachmentId: attA,
    });

    assert.equal(res.success, true, 'Management can delete attachment');
    assert.equal(calls.storageRemoves.length, 1);
    console.log('✓ 8. Delete attachment by Management succeeds');
  }

  // Test 9: Signed URL - legitimate viewer in same squad receives signed URL
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userAOther, state);
    const res = await actions.getAttachmentSignedUrlAction({
      attachmentId: attA,
    });

    assert.equal(res.success, true, 'Same squad member can view attachment');
    assert.ok(res.signedUrl, 'Signed URL should be returned');
    assert.equal(calls.signedUrls[0].storagePath, `tasks/${taskA}/1700000000-spec.pdf`);
    console.log('✓ 9. Signed URL request by squad member succeeds using database path');
  }

  // Test 10: Signed URL - cross-team member requesting private attachment is rejected
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userBMember, state);
    const res = await actions.getAttachmentSignedUrlAction({
      attachmentId: attA,
    });

    assert.equal(res.success, false, 'Cross-team member cannot view attachment');
    assert.match(res.error, /tidak memiliki izin/i);
    assert.equal(calls.signedUrls.length, 0, 'No signed URL generated');
    console.log('✓ 10. Signed URL request by cross-team member is rejected');
  }

  // Test 11: Signed URL - unrecorded arbitrary storage path is rejected without lookup
  {
    const state = getInitialState();
    const { actions, calls } = loadAction(userAUploader, state);
    const res = await actions.getAttachmentSignedUrlAction(
      'tasks/some-other-task/private-credentials.env'
    );

    assert.equal(res.success, false, 'Unrecorded arbitrary path should fail');
    assert.match(res.error, /tidak ditemukan atau Anda tidak memiliki akses/i);
    assert.equal(calls.signedUrls.length, 0, 'No signed URL generated');
    console.log('✓ 11. Signed URL for arbitrary unrecorded storage path is rejected');
  }

  console.log('\nAll 11 Task Attachments Authorization Checks PASSED successfully!');
}

runTests().catch((err) => {
  console.error('\nTest Suite FAILED:', err);
  process.exit(1);
});
