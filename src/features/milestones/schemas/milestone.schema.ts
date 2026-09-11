import { z } from 'zod';

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const createMilestoneSchema = z
  .object({
    title: z
      .string({ message: 'Judul milestone wajib diisi' })
      .trim()
      .min(3, 'Judul milestone minimal 3 karakter')
      .max(100, 'Judul milestone maksimal 100 karakter'),
    description: z
      .string()
      .trim()
      .max(500, 'Deskripsi maksimal 500 karakter')
      .optional()
      .or(z.literal('')),
    startDate: z
      .string({ message: 'Tanggal mulai wajib diisi' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal mulai harus YYYY-MM-DD')
      .refine((val) => !isNaN(Date.parse(val)), 'Tanggal mulai tidak valid'),
    targetDate: z
      .string({ message: 'Tanggal target wajib diisi' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal target harus YYYY-MM-DD')
      .refine((val) => !isNaN(Date.parse(val)), 'Tanggal target tidak valid'),
    picId: z
      .string()
      .regex(uuidRegex, 'PIC tidak valid')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => new Date(data.targetDate) >= new Date(data.startDate), {
    message: 'Tanggal target tidak boleh lebih awal dari tanggal mulai',
    path: ['targetDate'],
  });

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
