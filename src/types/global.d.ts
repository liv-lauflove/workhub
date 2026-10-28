/**
 * Global type declarations for the Workhub application.
 */

/** Standard server action return type for form submissions */
export type ActionState<T = void> =
  | { success: true; data?: T }
  | { success: false; error: Record<string, string[]> };

/** Pagination params used across queries */
export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

/** Standard metadata for paginated query responses */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Standard paginated result structure */
export interface PaginatedResult<T> {
  data: T[];
  metadata: PaginationMetadata;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';
