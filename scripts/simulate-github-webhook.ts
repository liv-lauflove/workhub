import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Parse .env.local manually without external dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const SECRET =
  process.env.GITHUB_WEBHOOK_SECRET || 'your-github-webhook-secret';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/github-webhook`;

function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

async function testPingEvent() {
  console.log('\n--- 1. Testing Ping Event ---');
  const payload = JSON.stringify({
    zen: 'Simplicity is prerequisite for reliability.',
    hook_id: 12345678,
  });

  const signature = generateSignature(payload, SECRET);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'ping',
      'x-github-delivery': crypto.randomUUID(),
      'x-hub-signature-256': signature,
    },
    body: payload,
  });

  const data = await res.json();
  console.log('Status:', res.status, res.statusText);
  console.log('Response body:', data);
  if (res.status === 200 && data.message?.includes('Pong')) {
    console.log('✅ PING EVENT TEST PASSED');
  } else {
    console.error('❌ PING EVENT TEST FAILED');
  }
}

async function testInvalidSignature() {
  console.log('\n--- 2. Testing Invalid Signature ---');
  const payload = JSON.stringify({
    ref: 'refs/heads/main',
    commits: [],
  });

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'push',
      'x-github-delivery': crypto.randomUUID(),
      'x-hub-signature-256':
        'sha256=invalidhash0000000000000000000000000000000000000000000000000000',
    },
    body: payload,
  });

  const data = await res.json();
  console.log('Status:', res.status, res.statusText);
  console.log('Response body:', data);
  if (res.status === 401) {
    console.log('✅ INVALID SIGNATURE REJECTION PASSED');
  } else {
    console.error('❌ INVALID SIGNATURE TEST FAILED');
  }
}

async function testPushEvent(branchName: string) {
  console.log(`\n--- 3. Testing Push Event for branch "${branchName}" ---`);
  const payload = JSON.stringify({
    ref: `refs/heads/${branchName}`,
    repository: {
      id: 999999,
      name: 'workhub',
      full_name: 'liv-lauflove/workhub',
      html_url: 'https://github.com/liv-lauflove/workhub',
    },
    pusher: {
      name: 'wsantika',
      email: 'wahyuputra7396@gmail.com',
    },
    commits: [
      {
        id: crypto.randomBytes(20).toString('hex'),
        message:
          'feat(testing): test commit from simulated webhook endpoint #41',
        timestamp: new Date().toISOString(),
        url: 'https://github.com/liv-lauflove/workhub/commit/abcdef1234567890',
        author: {
          name: 'wsantika',
          email: 'wahyuputra7396@gmail.com',
          username: 'wsantika',
        },
      },
    ],
  });

  const signature = generateSignature(payload, SECRET);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'push',
      'x-github-delivery': crypto.randomUUID(),
      'x-hub-signature-256': signature,
    },
    body: payload,
  });

  const data = await res.json();
  console.log('Status:', res.status, res.statusText);
  console.log('Response body:', data);
  if (res.status === 200 && data.success) {
    console.log('✅ PUSH EVENT TEST PASSED');
  } else {
    console.error('❌ PUSH EVENT TEST FAILED');
  }
}

async function main() {
  console.log('🚀 Running GitHub Webhook Simulator against:', ENDPOINT);
  console.log(
    'Using Webhook Secret:',
    SECRET ? '***' + SECRET.slice(-4) : '(empty)'
  );

  await testPingEvent();
  await testInvalidSignature();

  // Test branch with a sample name
  const branchToTest = process.argv[2] || 'feat/issue-40-github-branch-input';
  await testPushEvent(branchToTest);
}

main().catch(console.error);
