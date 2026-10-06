/**
 * Storage configuration, constants, and utilities for Workhub attachments.
 * Configured in accordance with Supabase Cloud Storage security policies (Issue #36).
 */

export const ATTACHMENTS_BUCKET = 'attachments';

/** Maximum allowed file size: 10 Megabytes (in bytes) */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

/** Human-readable max file size string */
export const MAX_ATTACHMENT_SIZE_LABEL = '10 MB';

/** Maximum allowed file size for Task attachments: 5 Megabytes (in bytes) - Issue #37 */
export const MAX_TASK_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes

/** Human-readable max task attachment file size string */
export const MAX_TASK_ATTACHMENT_SIZE_LABEL = '5 MB';

/**
 * MIME types allowed by server-level bucket configuration:
 * PDF documents and standard image formats (JPEG, PNG, WebP).
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/** Friendly extension mapping for display purposes */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

/**
 * Checks if a given MIME type is permitted by the attachments storage bucket.
 */
export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase()
  );
}

/**
 * Checks if file size does not exceed the 10MB limit.
 */
export function isAllowedAttachmentFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_ATTACHMENT_SIZE_BYTES;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before initiating upload to Supabase Storage.
 */
export function validateAttachmentFile(file: {
  size: number;
  type: string;
  name?: string;
}): AttachmentValidationResult {
  if (!file) {
    return { valid: false, error: 'Berkas tidak ditemukan.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Ukuran berkas tidak valid atau kosong.' };
  }

  if (!isAllowedAttachmentFileSize(file.size)) {
    return {
      valid: false,
      error: `Ukuran berkas (${formatAttachmentFileSize(file.size)}) melebihi batas maksimum ${MAX_ATTACHMENT_SIZE_LABEL}.`,
    };
  }

  if (!isAllowedAttachmentMimeType(file.type)) {
    return {
      valid: false,
      error: `Format berkas (${file.type || 'tidak dikenal'}) tidak didukung. Hanya PDF, JPG, PNG, dan WebP yang diizinkan.`,
    };
  }

  return { valid: true };
}

/**
 * Checks if task attachment file size does not exceed the 5MB limit.
 */
export function isAllowedTaskAttachmentFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_TASK_ATTACHMENT_SIZE_BYTES;
}

/**
 * Validates a task attachment file specifically against the 5MB limit and allowed MIME types.
 */
export function validateTaskAttachmentFile(file: {
  size: number;
  type: string;
  name?: string;
}): AttachmentValidationResult {
  if (!file) {
    return { valid: false, error: 'Berkas tidak ditemukan.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Ukuran berkas tidak valid atau kosong.' };
  }

  if (!isAllowedTaskAttachmentFileSize(file.size)) {
    return {
      valid: false,
      error: `Ukuran berkas (${formatAttachmentFileSize(file.size)}) melebihi batas maksimum ${MAX_TASK_ATTACHMENT_SIZE_LABEL}. Berkas otomatis ditolak.`,
    };
  }

  if (!isAllowedAttachmentMimeType(file.type)) {
    return {
      valid: false,
      error: `Format berkas (${file.type || 'tidak dikenal'}) tidak didukung. Hanya PDF, JPG, PNG, dan WebP yang diizinkan.`,
    };
  }

  return { valid: true };
}

/**
 * Generates a structured storage path for an attachment:
 * Format: `tasks/<taskId>/<timestamp>-<sanitizedFileName>`
 */
export function generateAttachmentStoragePath(
  taskId: string,
  originalFileName: string
): string {
  const sanitized = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();
  const timestamp = Date.now();
  return `tasks/${taskId}/${timestamp}-${sanitized}`;
}

/**
 * Format bytes into human-readable size string (KB / MB).
 */
export function formatAttachmentFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
