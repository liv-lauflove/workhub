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

/**
 * Normalizes a GitHub repository identifier entered by a user or received from a payload.
 * Supports:
 * - "https://github.com/liv-lauflove/workhub.git" -> "liv-lauflove/workhub"
 * - "git@github.com:liv-lauflove/workhub.git"     -> "liv-lauflove/workhub"
 * - "liv-lauflove/workhub/"                       -> "liv-lauflove/workhub"
 * - "workhub-frontend"                            -> "workhub-frontend"
 */
export function normalizeGithubRepository(
  repoInput: string | null | undefined
): string {
  if (!repoInput) return '';
  let cleaned = repoInput.trim();
  if (!cleaned) return '';

  cleaned = cleaned.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  cleaned = cleaned.replace(/^git@github\.com:/i, '');
  cleaned = cleaned.replace(/\.git$/i, '');
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');

  // If user pasted a deeper URL like owner/repo/tree/main, keep only owner/repo
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0] || '';
}

/**
 * Checks whether a task's configured github_repo matches the incoming GitHub webhook repository.
 * - If task has no github_repo configured (null or empty), returns true (backward-compatible wildcard).
 * - If task has github_repo configured, matches case-insensitively against repository.name or repository.full_name.
 */
export function matchesTaskRepository(
  taskGithubRepo: string | null | undefined,
  payloadRepo:
    | {
        name?: string | null;
        full_name?: string | null;
        html_url?: string | null;
      }
    | null
    | undefined
): boolean {
  const normalizedTaskRepo =
    normalizeGithubRepository(taskGithubRepo).toLowerCase();

  // Backward compatibility: if task does not restrict repository, match any repo on the branch
  if (!normalizedTaskRepo) {
    return true;
  }

  if (!payloadRepo) {
    return false;
  }

  const repoName = normalizeGithubRepository(payloadRepo.name).toLowerCase();
  const repoFullName = normalizeGithubRepository(
    payloadRepo.full_name || payloadRepo.html_url
  ).toLowerCase();

  if (normalizedTaskRepo.includes('/')) {
    return normalizedTaskRepo === repoFullName;
  }

  return normalizedTaskRepo === repoName || normalizedTaskRepo === repoFullName;
}

/**
 * Extracts "owner/repo" from a GitHub commit URL if possible.
 * Example: "https://github.com/liv-lauflove/workhub/commit/9a9a2a6" -> "liv-lauflove/workhub"
 */
export function extractRepositoryFromCommitUrl(
  commitUrl: string | null | undefined
): string | null {
  if (!commitUrl) return null;
  const match = commitUrl
    .trim()
    .match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+\/[^/]+)\/commit\//i);
  return match ? match[1] : null;
}
