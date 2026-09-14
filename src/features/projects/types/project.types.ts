import type { Database } from '@/types/database.types';

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type ProjectStatus = Database['public']['Enums']['project_status'];

export type ProjectWithDetails = Project & {
  milestone?: {
    id: string;
    title: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  pic?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};
