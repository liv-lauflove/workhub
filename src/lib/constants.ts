/**
 * Application-wide constants.
 */

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum file upload size in bytes (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed file types for task attachments */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/** Overload threshold percentage (PRD §6 — >80% = overload) */
export const OVERLOAD_THRESHOLD = 80;

/** Team names (matches DB constraint) */
export const TEAM_NAMES = ['Aegis', 'Sentinel'] as const;
