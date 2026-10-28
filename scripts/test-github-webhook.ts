import crypto from 'node:crypto';
import {
  verifyGithubWebhookSignature,
  extractBranchNameFromRef,
  normalizeGithubRepository,
  matchesTaskRepository,
  extractRepositoryFromCommitUrl,
} from '../src/features/github/lib/webhook-verifier';

/**
 * Verification test for Issue #41 & Issue #133:
 * - GitHub Webhook Signature Verification
 * - Branch Extraction
 * - Multi-Repository Normalization & Filtering
 * Run with: npx tsx scripts/test-github-webhook.ts
 */
async function runTests() {
  console.log(
    '=== TEST SUITE: GITHUB WEBHOOK VERIFIER & MULTI-REPO (#41 & #133) ===\n'
  );

  const secret = 'my-super-secret-webhook-key-123';
  const samplePayload = JSON.stringify({
    ref: 'refs/heads/feat/issue-41-github-webhook-endpoint',
    repository: {
      name: 'workhub',
      full_name: 'liv-lauflove/workhub',
      html_url: 'https://github.com/liv-lauflove/workhub',
    },
    commits: [
      {
        id: '9a9a2a6b2c4d6e8f101112131415161718192021',
        message: 'feat(github): add webhook endpoint',
        timestamp: '2026-10-20T10:00:00Z',
        url: 'https://github.com/liv-lauflove/workhub/commit/9a9a2a6',
        author: {
          name: 'Wahyu Santika',
          email: 'wahyuputra7396@gmail.com',
          username: 'wsantika',
        },
      },
    ],
  });

  // 1. Generate valid HMAC-SHA256 signature
  const validHmac = crypto.createHmac('sha256', secret);
  validHmac.update(samplePayload, 'utf8');
  const validSignature = `sha256=${validHmac.digest('hex')}`;

  console.log('1. Testing Valid Signature:');
  const isSignatureValid = verifyGithubWebhookSignature(
    samplePayload,
    validSignature,
    secret
  );
  console.log(`   Result: ${isSignatureValid ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!isSignatureValid) {
    throw new Error('Valid signature was rejected!');
  }

  // 2. Testing Invalid Signature
  console.log('2. Testing Tampered Signature:');
  const invalidSignature =
    'sha256=0000000000000000000000000000000000000000000000000000000000000000';
  const isInvalidRejected = !verifyGithubWebhookSignature(
    samplePayload,
    invalidSignature,
    secret
  );
  console.log(
    `   Result: ${isInvalidRejected ? 'PASSED (Rejected) ✅' : 'FAILED ❌'}`
  );
  if (!isInvalidRejected) {
    throw new Error('Invalid signature was accepted!');
  }

  // 3. Testing Tampered Payload
  console.log('3. Testing Tampered Payload with Original Signature:');
  const tamperedPayload = samplePayload + ' ';
  const isTamperedRejected = !verifyGithubWebhookSignature(
    tamperedPayload,
    validSignature,
    secret
  );
  console.log(
    `   Result: ${isTamperedRejected ? 'PASSED (Rejected) ✅' : 'FAILED ❌'}`
  );
  if (!isTamperedRejected) {
    throw new Error('Tampered payload was accepted!');
  }

  // 4. Testing Missing or Malformed Headers
  console.log('4. Testing Missing / Malformed Signature Header:');
  const isMissingRejected =
    !verifyGithubWebhookSignature(samplePayload, null, secret) &&
    !verifyGithubWebhookSignature(samplePayload, '', secret) &&
    !verifyGithubWebhookSignature(samplePayload, 'md5=xyz', secret);
  console.log(
    `   Result: ${isMissingRejected ? 'PASSED (Rejected) ✅' : 'FAILED ❌'}`
  );
  if (!isMissingRejected) {
    throw new Error('Malformed signature header was accepted!');
  }

  // 5. Testing Branch Extraction
  console.log('5. Testing Branch Ref Extraction:');
  const testCases = [
    { input: 'refs/heads/main', expected: 'main' },
    {
      input: 'refs/heads/feat/issue-40-github-branch-input',
      expected: 'feat/issue-40-github-branch-input',
    },
    {
      input: 'refs/heads/fix/issue-119-multi-team',
      expected: 'fix/issue-119-multi-team',
    },
    {
      input: 'feature-branch-without-prefix',
      expected: 'feature-branch-without-prefix',
    },
    { input: '', expected: '' },
  ];

  for (const tc of testCases) {
    const extracted = extractBranchNameFromRef(tc.input);
    const passed = extracted === tc.expected;
    console.log(
      `   Input: "${tc.input}" -> "${extracted}" [${passed ? 'OK' : 'MISMATCH'}]`
    );
    if (!passed) {
      throw new Error(`Branch extraction mismatch for "${tc.input}"`);
    }
  }

  // 6. Testing Multi-Repo Normalization (#133)
  console.log('6. Testing Repository Input Normalization (#133):');
  const repoNormalizationCases = [
    {
      input: 'https://github.com/liv-lauflove/workhub.git',
      expected: 'liv-lauflove/workhub',
    },
    {
      input: 'git@github.com:liv-lauflove/workhub-api.git',
      expected: 'liv-lauflove/workhub-api',
    },
    {
      input: '  liv-lauflove/workhub-fe/  ',
      expected: 'liv-lauflove/workhub-fe',
    },
    { input: 'workhub-mobile', expected: 'workhub-mobile' },
    { input: null, expected: '' },
  ];

  for (const rc of repoNormalizationCases) {
    const normalized = normalizeGithubRepository(rc.input);
    const passed = normalized === rc.expected;
    console.log(
      `   Input: "${rc.input}" -> "${normalized}" [${passed ? 'OK' : 'MISMATCH'}]`
    );
    if (!passed) {
      throw new Error(`Repo normalization mismatch for "${rc.input}"`);
    }
  }

  // 7. Testing Multi-Repo Isolation & Filtering (#133)
  console.log('7. Testing Multi-Repository Isolation & Filtering (#133):');
  const frontendPayloadRepo = {
    name: 'workhub-frontend',
    full_name: 'liv-lauflove/workhub-frontend',
    html_url: 'https://github.com/liv-lauflove/workhub-frontend',
  };
  const backendPayloadRepo = {
    name: 'workhub-backend',
    full_name: 'liv-lauflove/workhub-backend',
    html_url: 'https://github.com/liv-lauflove/workhub-backend',
  };

  // Case A: Task with null github_repo matches any repo (backward compatibility)
  if (!matchesTaskRepository(null, frontendPayloadRepo)) {
    throw new Error('Null github_repo should match as wildcard!');
  }
  // Case B: Task pinned to 'workhub-frontend' matches frontend push
  if (!matchesTaskRepository('workhub-frontend', frontendPayloadRepo)) {
    throw new Error('Short repo name should match frontend repo!');
  }
  // Case C: Task pinned to 'liv-lauflove/workhub-frontend' matches frontend push
  if (
    !matchesTaskRepository(
      'https://github.com/liv-lauflove/workhub-frontend.git',
      frontendPayloadRepo
    )
  ) {
    throw new Error('Full URL repo should match frontend repo!');
  }
  // Case D: Task pinned to 'workhub-frontend' MUST NOT match backend push on same branch
  if (matchesTaskRepository('workhub-frontend', backendPayloadRepo)) {
    throw new Error(
      'Cross-repo leak! Frontend task matched backend push event!'
    );
  }
  console.log('   Multi-repo isolation checks: PASSED ✅');

  // 8. Testing Commit URL Repo Extraction (#133)
  console.log('8. Testing Commit URL Repository Extraction (#133):');
  const extractedRepo = extractRepositoryFromCommitUrl(
    'https://github.com/liv-lauflove/workhub-backend/commit/9a9a2a6b2c4d6e8f'
  );
  if (extractedRepo !== 'liv-lauflove/workhub-backend') {
    throw new Error(`Unexpected extracted repo: ${extractedRepo}`);
  }
  console.log(`   Extracted repo from commit URL: "${extractedRepo}" [OK]`);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ✅ ===');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
