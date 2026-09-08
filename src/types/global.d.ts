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

/** Sort direction */
export type SortDirection = 'asc' | 'desc';
