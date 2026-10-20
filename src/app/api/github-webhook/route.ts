import { type NextRequest, NextResponse } from 'next/server';
import { verifyGithubWebhookSignature } from '@/features/github/lib/webhook-verifier';
import { handleGitHubPushEvent } from '@/features/github/lib/webhook-handler';
import type { GitHubPushEventPayload } from '@/features/github/types/github.types';

/**
 * GET /api/github-webhook
 * Quick status check endpoint.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'active',
      endpoint: '/api/github-webhook',
      message:
        'GitHub Webhook endpoint is active and listening for POST events.',
    },
    { status: 200 }
  );
}

/**
 * POST /api/github-webhook
 *
 * Receives and processes events from GitHub Webhooks.
 * Validates HMAC-SHA256 signature using GITHUB_WEBHOOK_SECRET.
 *
 * Issue #41: [GitHub] Webhook Endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      console.error(
        '[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not configured in environment variables.'
      );
      return NextResponse.json(
        { error: 'Webhook secret is not configured on the server.' },
        { status: 500 }
      );
    }

    // 1. Read raw body as text for HMAC verification
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256');
    const githubEvent = request.headers.get('x-github-event') || 'unknown';
    const deliveryId = request.headers.get('x-github-delivery');

    // 2. Strict HMAC-SHA256 signature verification
    const isValid = verifyGithubWebhookSignature(
      rawBody,
      signatureHeader,
      secret
    );

    if (!isValid) {
      console.warn(
        `[GitHub Webhook] Unauthorized attempt: Invalid signature. Event: ${githubEvent}, Delivery: ${deliveryId}`
      );
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    // 3. Parse JSON payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    // 4. Handle GitHub Events
    switch (githubEvent) {
      case 'ping': {
        console.log(
          `[GitHub Webhook] Ping event received successfully from GitHub. Zen: "${payload.zen}"`
        );
        return NextResponse.json(
          {
            message: 'Pong! Webhook successfully verified and connected.',
            zen: payload.zen,
            hookId: payload.hook_id,
          },
          { status: 200 }
        );
      }

      case 'push': {
        const pushPayload = payload as unknown as GitHubPushEventPayload;
        const result = await handleGitHubPushEvent(pushPayload);

        console.log(
          `[GitHub Webhook] Push event processed. Branch: "${result.branch}", Tasks: ${result.matchedTasksCount ?? 0}, Commits: ${result.insertedCommitsCount ?? 0}`
        );

        return NextResponse.json(result, {
          status: result.success ? 200 : 500,
        });
      }

      default: {
        console.log(
          `[GitHub Webhook] Event "${githubEvent}" received and authenticated. No handler required.`
        );
        return NextResponse.json(
          {
            message: `Event "${githubEvent}" received and verified. No action taken.`,
            event: githubEvent,
          },
          { status: 200 }
        );
      }
    }
  } catch (error) {
    console.error('[GitHub Webhook] Unexpected internal server error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error while processing webhook event.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
