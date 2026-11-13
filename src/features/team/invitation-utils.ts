export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Check whether an invitation expiration timestamp has passed at or before `now`.
 */
export function isInvitationExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return false;
  return expiresTime <= now.getTime();
}

/**
 * Compute the effective invitation status from stored status and expiration time.
 */
export function resolveInvitationStatus(
  status: InvitationStatus,
  expiresAt: string | null | undefined,
  now: Date = new Date()
): InvitationStatus {
  if (status === 'pending' && isInvitationExpired(expiresAt, now)) {
    return 'expired';
  }
  return status;
}
