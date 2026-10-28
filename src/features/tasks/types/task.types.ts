import type { Database } from '@/types/database.types';

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];
export type TaskSubtaskRow =
  Database['public']['Tables']['task_subtasks']['Row'];
export type TaskSubtaskInsert =
  Database['public']['Tables']['task_subtasks']['Insert'];
export type TaskSubtaskUpdate =
  Database['public']['Tables']['task_subtasks']['Update'];

export type TaskPurpose = Database['public']['Enums']['task_purpose'];
export type TaskDevStatus = Database['public']['Enums']['task_dev_status'];
export type TaskTestStatus = Database['public']['Enums']['task_test_status'];

export interface TaskSubtask extends TaskSubtaskRow {
  tester?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

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
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  developer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  tester?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
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
  developer?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url: string | null;
  } | null;
  tester?: {
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
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachmentItem[];
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

export type TaskAttachment =
  Database['public']['Tables']['task_attachments']['Row'];

export interface TaskAttachmentItem extends TaskAttachment {
  uploader?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface ProjectTaskItem extends Task {
  column?: {
    id: string;
    name: string;
    position: number;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  developer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  tester?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  comments?: Array<{ count: number }> | null;
}
