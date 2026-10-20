import crypto from 'node:crypto';

/**
 * Verifies the HMAC-SHA256 signature from GitHub Webhooks.
 * Uses timingSafeEqual to protect against timing attacks.
 *
 * @param rawBody - Raw body text of the webhook request
 * @param signatureHeader - Value of 'x-hub-signature-256' header (e.g. 'sha256=abcdef...')
 * @param secret - GitHub webhook secret key from environment
 */
export function verifyGithubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // GitHub sends header formatted as "sha256=<hex_digest>"
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const signatureHex = signatureHeader.slice(prefix.length).trim();
  if (!signatureHex) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody, 'utf8');
    const digestHex = hmac.digest('hex');

    const expectedBuffer = Buffer.from(digestHex, 'utf8');
    const signatureBuffer = Buffer.from(signatureHex, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('[GitHub Webhook] Error verifying signature:', error);
    return false;
  }
}

/**
 * Extracts a clean branch name from a Git ref string.
 * Example: "refs/heads/feat/issue-40-github-branch-input" -> "feat/issue-40-github-branch-input"
 *
 * @param ref - Git ref from GitHub push payload
 */
export function extractBranchNameFromRef(
  ref: string | null | undefined
): string {
  if (!ref) return '';
  const headsPrefix = 'refs/heads/';
  if (ref.startsWith(headsPrefix)) {
    return ref.slice(headsPrefix.length).trim();
  }
  return ref.trim();
}
