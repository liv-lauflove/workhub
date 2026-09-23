import { z } from 'zod';

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const createTaskSchema = z
  .object({
    title: z
      .string({ message: 'Judul task wajib diisi' })
      .trim()
      .min(3, 'Judul task minimal 3 karakter')
      .max(100, 'Judul task maksimal 100 karakter'),
    description: z
      .string()
      .trim()
      .max(1000, 'Deskripsi maksimal 1000 karakter')
      .optional()
      .or(z.literal('')),
    projectId: z
      .string({ message: 'Project ID wajib valid' })
      .regex(uuidRegex, 'Project ID tidak valid'),
    columnId: z
      .string({ message: 'Kolom Kanban tujuan wajib dipilih' })
      .regex(uuidRegex, 'Kolom tujuan tidak valid'),
    priority: z
      .enum(['critical', 'high', 'medium', 'low'], {
        message: 'Tingkat prioritas tidak valid',
      })
      .default('medium'),
    origin: z
      .enum(['normal', 'cs_complaint'], {
        message: 'Origin task tidak valid',
      })
      .default('normal'),
    originNote: z
      .string()
      .trim()
      .max(500, 'Catatan keluhan maksimal 500 karakter')
      .optional()
      .or(z.literal('')),
    dueDate: z.string().optional().or(z.literal('')),
    assigneeId: z
      .string()
      .regex(uuidRegex, 'Assignee tidak valid')
      .optional()
      .or(z.literal('')),
    githubBranch: z
      .string()
      .trim()
      .max(100, 'Nama branch maksimal 100 karakter')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      // If origin is cs_complaint, originNote is encouraged or validated
      if (data.origin === 'cs_complaint' && data.originNote) {
        return data.originNote.length >= 3;
      }
      return true;
    },
    {
      message: 'Catatan keluhan CS minimal 3 karakter jika diisi',
      path: ['originNote'],
    }
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
