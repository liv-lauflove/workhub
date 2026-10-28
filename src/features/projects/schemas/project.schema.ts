import { z } from 'zod';

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const createProjectSchema = z.object({
  name: z
    .string({ message: 'Nama project wajib diisi' })
    .trim()
    .min(3, 'Nama project minimal 3 karakter')
    .max(100, 'Nama project maksimal 100 karakter'),
  description: z
    .string()
    .trim()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
  milestoneId: z
    .string({ message: 'Milestone terkait wajib dipilih' })
    .regex(uuidRegex, 'Milestone tidak valid'),
  teamId: z
    .string({ message: 'Tim wajib dipilih' })
    .regex(uuidRegex, 'Tim tidak valid'),
  picId: z
    .string()
    .regex(uuidRegex, 'PIC tidak valid')
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['planned', 'in_progress', 'completed', 'blocked'], {
      message: 'Status project tidak valid',
    })
    .default('planned')
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
