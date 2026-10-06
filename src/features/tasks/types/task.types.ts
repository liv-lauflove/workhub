import type { Database } from '@/types/database.types';

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];

export interface MyTask extends Task {
  project?: {
    id: string;
    name: string;
    milestone?: {
      id: string;
      title: string;
    } | null;
  } | null;
  column?: {
    id: string;
    name: string;
    position: number;
  } | null;
}

export interface TaskDetail extends Task {
  project?: {
    id: string;
    name: string;
    team_id: string;
    milestone?: {
      id: string;
      title: string;
      target_date: string;
      status: string;
    } | null;
  } | null;
  column?: {
    id: string;
    name: string;
    position: number;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url: string | null;
  } | null;
}

export type ActivityLog = Database['public']['Tables']['activity_log']['Row'];

export interface TaskActivityLog extends ActivityLog {
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
}
