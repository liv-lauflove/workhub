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
