import { z } from 'zod';

/** Shared pagination schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** UUID validation */
export const uuidSchema = z.string().uuid('Invalid ID format');

/** Common date range schema */
export const dateRangeSchema = z
  .object({
    start_date: z.string(),
    target_date: z.string(),
  })
  .refine((data) => new Date(data.target_date) > new Date(data.start_date), {
    message: 'Target date must be after start date',
    path: ['target_date'],
  });
