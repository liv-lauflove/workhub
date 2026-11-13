import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const requireProject = createRequire(path.join(root, 'package.json'));
const ts = requireProject('typescript');

function loadSource(relative, dependencies = {}, cache = new Map()) {
  const file = path.join(root, relative);
  if (cache.has(file)) {
    return cache.get(file);
  }

  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const sourceModule = { exports: {} };
  cache.set(file, sourceModule.exports);

  const requireSource = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === 'zod') return requireProject(name);
    if (name.startsWith('node:')) return createRequire(import.meta.url)(name);
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), name);
      const targetTs = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies, cache);
      }
    }
    if (name.startsWith('@/')) {
      const target = path.join(root, name.replace(/^@\//, 'src/'));
      const targetTs = target.endsWith('.ts') ? target : `${target}.ts`;
      if (fs.existsSync(targetTs)) {
        return loadSource(path.relative(root, targetTs), dependencies, cache);
      }
    }
    throw new Error(
      `Unexpected dependency in AI cache isolation test (${relative}): ${name}`
    );
  };

  new Function('require', 'module', 'exports', output)(
    requireSource,
    sourceModule,
    sourceModule.exports
  );
  cache.set(file, sourceModule.exports);
  return sourceModule.exports;
}

const TEAM_ALPHA = 'b1490000-0000-4000-8000-000000000001';
const TEAM_BETA = 'b1490000-0000-4000-8000-000000000002';
const TEAM_MGMT = 'e3333333-3333-3333-3333-333333333333';

const USER_ALICE = 'a1490000-0000-4000-8000-000000000001';
const USER_BOB = 'a1490000-0000-4000-8000-000000000002';
const USER_CHARLIE = 'a1490000-0000-4000-8000-000000000003';
const USER_MGMT = 'a1490000-0000-4000-8000-000000000004';

function createMockDbState() {
  return {
    teams: [
      { id: TEAM_ALPHA, name: 'Alpha Squad' },
      { id: TEAM_BETA, name: 'Beta Squad' },
      { id: TEAM_MGMT, name: 'Management' },
    ],
    profiles: [
      {
        id: USER_ALICE,
        email: 'alice@workhub.invalid',
        full_name: 'Alice Alpha',
        role: 'member',
        team_id: TEAM_ALPHA,
      },
      {
        id: USER_BOB,
        email: 'bob@workhub.invalid',
        full_name: 'Bob Beta',
        role: 'member',
        team_id: TEAM_BETA,
      },
      {
        id: USER_CHARLIE,
        email: 'charlie@workhub.invalid',
        full_name: 'Charlie Alpha',
        role: 'member',
        team_id: TEAM_ALPHA,
      },
      {
        id: USER_MGMT,
        email: 'mgmt@workhub.invalid',
        full_name: 'Mgmt Leader',
        role: 'leader',
        team_id: TEAM_MGMT,
      },
    ],
    ai_query_cache: [],
    llmCalls: [],
  };
}

function createSupabaseClient(state, currentUserId, options = {}) {
  const isAdmin = Boolean(options.isAdmin);
  const enforceRls = options.enforceRls ?? true;

  function makeQueryBuilder(table) {
    const filters = [];
    let pendingOp = 'select';
    let payload = null;
    let countMode = null;

    const builder = {
      select(_cols, opts) {
        if (opts?.count) countMode = opts.count;
        return builder;
      },
      delete(opts) {
        pendingOp = 'delete';
        if (opts?.count) countMode = opts.count;
        return builder;
      },
      upsert(row) {
        pendingOp = 'upsert';
        payload = row;
        return builder.execute();
      },
      eq(col, val) {
        filters.push((row) => row[col] === val);
        return builder;
      },
      gt(col, val) {
        filters.push((row) => row[col] != null && row[col] > val);
        return builder;
      },
      lt(col, val) {
        filters.push((row) => row[col] != null && row[col] < val);
        return builder;
      },
      maybeSingle() {
        return builder.execute(true);
      },
      single() {
        return builder.execute(true);
      },
      execute(single = false) {
        if (table === 'ai_query_cache') {
          if (pendingOp === 'upsert') {
            if (!isAdmin) {
              return Promise.resolve({
                data: null,
                error: { message: 'permission denied for table ai_query_cache' },
              });
            }
            const existingIdx = state.ai_query_cache.findIndex(
              (r) => r.query_hash === payload.query_hash
            );
            const row = {
              id:
                existingIdx >= 0
                  ? state.ai_query_cache[existingIdx].id
                  : `cache-${state.ai_query_cache.length + 1}`,
              ...payload,
            };
            if (existingIdx >= 0) {
              state.ai_query_cache[existingIdx] = row;
            } else {
              state.ai_query_cache.push(row);
            }
            return Promise.resolve({ data: row, error: null });
          }

          if (pendingOp === 'delete') {
            if (!isAdmin) {
              return Promise.resolve({
                data: null,
                count: null,
                error: { message: 'permission denied for table ai_query_cache' },
              });
            }
            const remaining = [];
            let deletedCount = 0;
            for (const row of state.ai_query_cache) {
              if (filters.every((fn) => fn(row))) {
                deletedCount += 1;
              } else {
                remaining.push(row);
              }
            }
            state.ai_query_cache = remaining;
            return Promise.resolve({
              data: null,
              count: countMode ? deletedCount : null,
              error: null,
            });
          }

          let rows = state.ai_query_cache.filter((r) =>
            filters.every((fn) => fn(r))
          );

          if (enforceRls && !isAdmin) {
            const nowIso = new Date().toISOString();
            rows = rows.filter(
              (r) =>
                r.user_id === currentUserId &&
                (!r.expires_at || r.expires_at > nowIso)
            );
          }

          if (single) {
            return Promise.resolve({
              data: rows[0] ?? null,
              error: null,
            });
          }
          return Promise.resolve({ data: rows, error: null });
        }

        const sourceRows = state[table] || [];
        const matched = sourceRows.filter((r) => filters.every((fn) => fn(r)));
        if (single) {
          return Promise.resolve({ data: matched[0] ?? null, error: null });
        }
        return Promise.resolve({ data: matched, error: null });
      },
      then(resolve, reject) {
        return builder.execute(false).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    auth: {
      async getUser() {
        const profile = state.profiles.find((p) => p.id === currentUserId);
        if (!currentUserId || !profile) {
          return { data: { user: null }, error: { message: 'Unauthorized' } };
        }
        return {
          data: { user: { id: profile.id, email: profile.email } },
          error: null,
        };
      },
    },
    from(table) {
      return makeQueryBuilder(table);
    },
  };
}

function createNextServerMock() {
  return {
    NextResponse: {
      json(body, init) {
        return {
          status: init?.status ?? 200,
          body,
          async json() {
            return body;
          },
        };
      },
    },
  };
}

function createWorkloadMock(state) {
  return {
    async getSanitizedTeamWorkloadContext(targetTeamId) {
      const team = state.teams.find((t) => t.id === targetTeamId);
      const label =
        targetTeamId === 'all'
          ? 'Semua Tim (BSA Tech)'
          : team?.name || 'Tim Aktif';
      return {
        teamName: label,
        totalMembers: 2,
        availableCount: 1,
        overloadCount: 0,
        members: [],
        formattedContextString: `[LIVE WORKLOAD FOR ${label}]`,
      };
    },
  };
}

function buildModuleDeps(state, actorRef, options = {}) {
  const savedEnv = {};

  function resolveProviderInfo(requestedProvider) {
    const provider =
      requestedProvider ||
      process.env.AI_PROVIDER?.toLowerCase() ||
      'gemini';
    const model =
      provider === 'openai'
        ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
        : process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    return { provider, model };
  }

  const llmMock = {
    resolveLlmTarget(opts) {
      const { provider, model } = resolveProviderInfo(opts?.provider);
      return {
        provider,
        model: opts?.model || model,
        isSimulation: false,
      };
    },
    async invokeLlm(opts) {
      const { provider, model } = resolveProviderInfo(opts?.provider);
      const usedModel = opts?.model || model;
      state.llmCalls.push({
        provider,
        model: usedModel,
        prompt: opts.prompt,
        systemPrompt: opts.systemPrompt,
      });

      if (opts.systemPrompt?.includes('Technical Lead and Engineering Prioritization')) {
        return {
          text: JSON.stringify({
            suggestedPriority: 'high',
            estimatedDuration: '2 jam',
            reason: `Prioritas tinggi untuk ${actorRef.id} (${usedModel})`,
          }),
          provider,
          model: usedModel,
        };
      }

      const userMatch = opts.systemPrompt?.match(/- User: (.+)/);
      const roleMatch = opts.systemPrompt?.match(/- Role: (.+)/);
      const teamMatch = opts.systemPrompt?.match(/- Team: (.+)/);
      const quarterMatch = opts.systemPrompt?.match(/- Quarter: (.+)/);

      return {
        text: [
          `Reply for ${userMatch?.[1] ?? 'unknown'}`,
          `role=${roleMatch?.[1] ?? 'unknown'}`,
          `team=${teamMatch?.[1] ?? 'none'}`,
          `quarter=${quarterMatch?.[1] ?? 'none'}`,
          `provider=${provider}`,
          `model=${usedModel}`,
          `prompt=${opts.prompt}`,
        ].join(' | '),
        provider,
        model: usedModel,
        usage: { totalTokens: 42 },
      };
    },
  };

  const deps = {
    'server-only': {},
    'next/server': createNextServerMock(),
    '@/lib/supabase/server': {
      async createClient() {
        return createSupabaseClient(state, actorRef.id, {
          isAdmin: false,
          enforceRls: options.enforceRls ?? true,
        });
      },
    },
    '@/lib/supabase/admin': {
      createAdminClient() {
        return createSupabaseClient(state, actorRef.id, {
          isAdmin: true,
          enforceRls: false,
        });
      },
    },
    '@/features/ai/rag/workload-aggregator': createWorkloadMock(state),
    '../rag/workload-aggregator': createWorkloadMock(state),
    '@/features/ai/lib/llm-client': llmMock,
    './llm-client': llmMock,
    '../lib/llm-client': llmMock,
  };

  return { deps, savedEnv };
}

async function run() {
  console.log('--- RUNNING AI CACHE ISOLATION & NORMALIZATION TESTS (ISSUE #149) ---');
  let passed = 0;
  function ok(name) {
    passed += 1;
    console.log(`✔ Test ${passed} Passed: ${name}`);
  }

  const state = createMockDbState();
  const actor = { id: USER_ALICE };
  const { deps } = buildModuleDeps(state, actor);

  const cacheQueries = loadSource(
    'src/features/ai/queries/ai-cache.queries.ts',
    deps
  );
  const routeRag = loadSource('src/app/api/ai/chat/route.ts', deps);
  const routeLegacy = loadSource('src/app/api/ai-chat/route.ts', deps);
  const actions = loadSource('src/features/ai/actions/ai.actions.ts', deps);

  // Test 1: B06 Arithmetic operators produce distinct normalized strings & hashes
  assert.notEqual(
    cacheQueries.normalizeQueryText('1+1'),
    cacheQueries.normalizeQueryText('1-1')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('1+1'),
    cacheQueries.generateQueryHash('1-1')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('1*1'),
    cacheQueries.generateQueryHash('1/1')
  );
  ok('B06: Arithmetic expressions (1+1, 1-1, 1*1, 1/1) stay distinct');

  // Test 2: B06 Punctuation, negation, code tokens, and symbols stay distinct
  assert.notEqual(
    cacheQueries.generateQueryHash('A == B'),
    cacheQueries.generateQueryHash('A != B')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('C++'),
    cacheQueries.generateQueryHash('C#')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('Apakah selesai?'),
    cacheQueries.generateQueryHash('Apakah selesai!')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('Issue #149'),
    cacheQueries.generateQueryHash('Issue 149')
  );
  assert.notEqual(
    cacheQueries.generateQueryHash('-5'),
    cacheQueries.generateQueryHash('5')
  );
  ok('B06: Meaningful punctuation, operators, negations, and code symbols preserved');

  // Test 3: Benign whitespace & casing normalize consistently
  assert.equal(
    cacheQueries.generateQueryHash('  Apa   itu   Workhub?  '),
    cacheQueries.generateQueryHash('apa itu workhub?')
  );
  ok('Whitespace collapsing and case-folding remain consistent');

  // Test 4: Delimiter collision prevention (canonical tuple encoding)
  assert.notEqual(
    cacheQueries.generateQueryHash('c', { userId: 'a:b', scope: 's' }),
    cacheQueries.generateQueryHash('c', { userId: 'a', scope: 'b:s' })
  );
  ok('Canonical JSON cache-key prevents separator/delimiter collisions');

  // Test 5: User A miss -> populate -> hit on POST /api/ai/chat
  const resA1 = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Jelaskan tabel tasks di Workhub' }),
    })
  );
  assert.equal(resA1.status, 200);
  assert.equal(resA1.body.isCached, false);
  assert.match(resA1.body.reply, /Reply for Alice Alpha \| role=member \| team=Alpha Squad/);
  assert.equal(state.llmCalls.length, 1);

  const resA2 = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '  jelaskan tabel tasks di workhub  ' }),
    })
  );
  assert.equal(resA2.status, 200);
  assert.equal(resA2.body.isCached, true);
  assert.equal(resA2.body.reply, resA1.body.reply);
  assert.equal(state.llmCalls.length, 1);
  ok('Alice receives own cached response on repeated identical query');

  // Test 6: Different team User B sending the exact same prompt does NOT get Alice's cache
  actor.id = USER_BOB;
  const resB1 = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Jelaskan tabel tasks di Workhub' }),
    })
  );
  assert.equal(resB1.status, 200);
  assert.equal(resB1.body.isCached, false);
  assert.match(resB1.body.reply, /Reply for Bob Beta \| role=member \| team=Beta Squad/);
  assert.equal(state.llmCalls.length, 2);
  ok('Bob (Beta Squad) never shares or sees Alice private cache');

  // Test 7: Same-team different user Charlie does NOT receive Alice's cache either
  actor.id = USER_CHARLIE;
  const resC1 = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Jelaskan tabel tasks di Workhub' }),
    })
  );
  assert.equal(resC1.status, 200);
  assert.equal(resC1.body.isCached, false);
  assert.match(resC1.body.reply, /Reply for Charlie Alpha \| role=member \| team=Alpha Squad/);
  assert.equal(state.llmCalls.length, 3);
  ok('Same-team user Charlie never receives Alice personal cached response');

  // Test 8: Spoofed client context is ignored across POST /api/ai/chat, POST /api/ai-chat, and Server Action
  actor.id = USER_ALICE;
  const spoofPayload = {
    prompt: 'Apa role dan tim saya saat ini?',
    context: {
      userName: 'Spoofed Superadmin',
      userRole: 'leader',
      teamName: 'Management',
      currentQuarter: '2026-Q4',
    },
  };
  const resSpoof1 = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(spoofPayload),
    })
  );
  assert.equal(resSpoof1.status, 200);
  assert.match(resSpoof1.body.reply, /Reply for Alice Alpha \| role=member \| team=Alpha Squad \| quarter=2026-Q4/);
  assert.doesNotMatch(resSpoof1.body.reply, /Spoofed Superadmin|Management/);

  // Calling alias /api/ai-chat hits unified Alice cache & server-derived rules
  const resSpoof2 = await routeLegacy.POST(
    new Request('http://localhost/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify(spoofPayload),
    })
  );
  assert.equal(resSpoof2.status, 200);
  assert.equal(resSpoof2.body.isCached, true);
  assert.equal(resSpoof2.body.reply, resSpoof1.body.reply);

  // Calling sendAiChatMessageAction hits unified rules as well
  const resSpoof3 = await actions.sendAiChatMessageAction(spoofPayload);
  assert.equal(resSpoof3.success, true);
  assert.equal(resSpoof3.data.isCached, true);
  assert.equal(resSpoof3.data.reply, resSpoof1.body.reply);
  ok('All three chat endpoints derive server identity and ignore spoofed client context');

  // Test 9: Non-Management cross-team teamId override is rejected with 403
  const crossTeamRes = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Jelaskan tabel tasks di Workhub',
        teamId: TEAM_BETA,
      }),
    })
  );
  assert.equal(crossTeamRes.status, 403);
  ok('Non-Management member cannot override teamId scope');

  // Test 10: Legacy /api/ai-chat also bypasses cache for real-time workload queries
  const callsBeforeWorkload = state.llmCalls.length;
  const workloadRes1 = await routeLegacy.POST(
    new Request('http://localhost/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Siapa member yang available untuk assign task?' }),
    })
  );
  assert.equal(workloadRes1.status, 200);
  assert.equal(workloadRes1.body.isCached, false);
  const workloadRes2 = await routeLegacy.POST(
    new Request('http://localhost/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Siapa member yang available untuk assign task?' }),
    })
  );
  assert.equal(workloadRes2.status, 200);
  assert.equal(workloadRes2.body.isCached, false);
  assert.equal(state.llmCalls.length, callsBeforeWorkload + 2);
  ok('/api/ai-chat bypasses cache for real-time workload queries like other entry points');

  // Test 11: Quarter change misses old context cache
  const quarterChanged = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Apa role dan tim saya saat ini?',
        context: { currentQuarter: '2027-Q1' },
      }),
    })
  );
  assert.equal(quarterChanged.status, 200);
  assert.equal(quarterChanged.body.isCached, false);
  assert.match(quarterChanged.body.reply, /quarter=2027-Q1/);
  ok('Changing context quarter invalidates prior cache');

  // Test 12: Provider change (gemini -> openai) misses old provider cache
  const providerChanged = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Jelaskan tabel tasks di Workhub',
        provider: 'openai',
      }),
    })
  );
  assert.equal(providerChanged.status, 200);
  assert.equal(providerChanged.body.isCached, false);
  assert.match(providerChanged.body.reply, /provider=openai \| model=gpt-4o-mini/);
  ok('Switching provider misses prior provider cache');

  // Test 13: Model env change misses old model cache
  const origGeminiModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  const modelChanged = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Jelaskan tabel tasks di Workhub',
      }),
    })
  );
  assert.equal(modelChanged.status, 200);
  assert.equal(modelChanged.body.isCached, false);
  assert.match(modelChanged.body.reply, /model=gemini-2\.5-flash/);
  process.env.GEMINI_MODEL = origGeminiModel;
  ok('Changing model identifier invalidates previous model cache');

  // Test 14: Role or team promotion in DB invalidates old cache
  const aliceProfile = state.profiles.find((p) => p.id === USER_ALICE);
  aliceProfile.role = 'leader';
  const promotedRes = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Jelaskan tabel tasks di Workhub' }),
    })
  );
  assert.equal(promotedRes.status, 200);
  assert.equal(promotedRes.body.isCached, false);
  assert.match(promotedRes.body.reply, /role=leader/);
  aliceProfile.role = 'member';
  ok('Changing user role in DB invalidates previous role cache');

  // Test 15: Management authorized team scoping isolates Team A vs Team B cache
  actor.id = USER_MGMT;
  const mgmtAlpha = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Jelaskan arsitektur RBAC', teamId: TEAM_ALPHA }),
    })
  );
  assert.equal(mgmtAlpha.status, 200);
  assert.equal(mgmtAlpha.body.isCached, false);
  assert.match(mgmtAlpha.body.reply, /team=Alpha Squad/);

  const mgmtBeta = await routeRag.POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Jelaskan arsitektur RBAC', teamId: TEAM_BETA }),
    })
  );
  assert.equal(mgmtBeta.status, 200);
  assert.equal(mgmtBeta.body.isCached, false);
  assert.match(mgmtBeta.body.reply, /team=Beta Squad/);
  ok('Management switching authorized team scope isolates cached responses');

  // Test 16: predictTaskPriorityAction isolates cache per user & model
  actor.id = USER_ALICE;
  const predA1 = await actions.predictTaskPriorityAction({
    title: 'Perbaiki otorisasi cache privat AI',
    description: 'Isolasi per user dan model',
  });
  assert.equal(predA1.success, true);
  assert.equal(predA1.data.isCached, false);

  const predA2 = await actions.predictTaskPriorityAction({
    title: 'Perbaiki otorisasi cache privat AI',
    description: 'Isolasi per user dan model',
  });
  assert.equal(predA2.success, true);
  assert.equal(predA2.data.isCached, true);

  actor.id = USER_BOB;
  const predB1 = await actions.predictTaskPriorityAction({
    title: 'Perbaiki otorisasi cache privat AI',
    description: 'Isolasi per user dan model',
  });
  assert.equal(predB1.success, true);
  assert.equal(predB1.data.isCached, false);
  ok('predictTaskPriorityAction isolates task priority cache per user');

  // Test 17: Defense-in-depth in getCachedAiResponse rejects missing userId, expired, and foreign rows even if RLS bypassed
  const { deps: noRlsDeps } = buildModuleDeps(state, actor, { enforceRls: false });
  const cacheNoRls = loadSource(
    'src/features/ai/queries/ai-cache.queries.ts',
    noRlsDeps,
    new Map()
  );

  // Insert an explicit Alice entry and query it while actor is Bob with RLS disabled
  const manualHash = 'forged-defense-hash';
  state.ai_query_cache.push({
    id: 'cache-defense',
    user_id: USER_ALICE,
    team_id: TEAM_ALPHA,
    cache_scope: 'eng-manager',
    provider: 'gemini',
    model: 'gemini-flash-lite-latest',
    prompt_version: 'eng-manager-v2',
    query_hash: manualHash,
    query_text: 'Rahasia Alice',
    response_text: 'Jawaban Rahasia Alice',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  });

  assert.equal(
    await cacheNoRls.getCachedAiResponse({ userId: '', queryHash: manualHash }),
    null
  );
  assert.equal(
    await cacheNoRls.getCachedAiResponse(manualHash),
    null
  );
  assert.equal(
    await cacheNoRls.getCachedAiResponse({ userId: USER_BOB, queryHash: manualHash }),
    null
  );

  // Expired row owned by Bob is also rejected
  state.ai_query_cache.push({
    id: 'cache-expired',
    user_id: USER_BOB,
    team_id: TEAM_BETA,
    cache_scope: 'eng-manager',
    provider: 'gemini',
    model: 'gemini-flash-lite-latest',
    prompt_version: 'eng-manager-v2',
    query_hash: 'expired-bob-hash',
    query_text: 'Expired Bob',
    response_text: 'Expired Resp',
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(),
  });
  assert.equal(
    await cacheNoRls.getCachedAiResponse({
      userId: USER_BOB,
      queryHash: 'expired-bob-hash',
    }),
    null
  );
  ok('Defense-in-depth blocks foreign, unowned, bare-string, and expired cache reads');

  // Test 18: TTL clamping and opportunistic expired purge in saveCachedAiResponse
  await cacheQueries.saveCachedAiResponse({
    userId: USER_BOB,
    teamId: 'all', // non-UUID team scope must sanitize cleanly to null in FK column
    cacheScope: 'eng-manager:all',
    provider: 'gemini',
    model: 'gemini-flash-lite-latest',
    promptVersion: 'eng-manager-v2',
    queryHash: 'ttl-clamp-hash',
    queryText: 'Test TTL Clamp',
    responseText: 'Clamped',
    ttlSeconds: 99999999,
  });

  const savedClamped = state.ai_query_cache.find(
    (r) => r.query_hash === 'ttl-clamp-hash'
  );
  assert.ok(savedClamped);
  assert.equal(savedClamped.team_id, null);
  const ttlDeltaMs =
    new Date(savedClamped.expires_at).getTime() -
    new Date(savedClamped.created_at).getTime();
  assert.ok(ttlDeltaMs <= 86400 * 1000 + 1000);
  assert.equal(
    state.ai_query_cache.some((r) => r.query_hash === 'expired-bob-hash'),
    false
  );
  ok('saveCachedAiResponse clamps excessive TTL <= 24h, sanitizes non-UUID team_id, and purges expired entries');

  console.log(`\n--- ALL ${passed} AI CACHE ISOLATION TESTS PASSED! ---`);
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
