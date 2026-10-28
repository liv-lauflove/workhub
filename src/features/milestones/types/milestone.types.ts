import type { Database } from '@/types/database.types';

export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type MilestoneInsert =
  Database['public']['Tables']['milestones']['Insert'];
export type MilestoneUpdate =
  Database['public']['Tables']['milestones']['Update'];

export interface MilestoneWithDetails extends Milestone {
  pic?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  projects?: {
    count: number;
  }[];
}
