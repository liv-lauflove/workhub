import { z } from 'zod';
import type { Database } from '@/types/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type GitHubIntegrationRow =
  Database['public']['Tables']['github_integrations']['Row'];

export interface ProfileWithTeam extends ProfileRow {
  email?: string;
  teams?: {
    id: string;
    name: string;
  } | null;
}

export interface UserSettingsData {
  user: {
    id: string;
    email?: string;
    createdAt?: string;
  };
  profile: ProfileWithTeam;
  githubIntegration: {
    id: string;
    github_user_id: string;
    scope: string | null;
    connected_at: string;
  } | null;
}

export const linkGitHubManualSchema = z.object({
  username: z
    .string()
    .min(1, 'Username GitHub wajib diisi')
    .max(39, 'Username GitHub maksimal 39 karakter')
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      'Format username GitHub tidak valid (hanya huruf, angka, dan tanda hubung tunggal)'
    ),
});

export type LinkGitHubManualInput = z.infer<typeof linkGitHubManualSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
  position: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
