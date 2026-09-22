import type { Database } from '@/types/database.types';

export type BoardColumn = Database['public']['Tables']['board_columns']['Row'];
export type BoardColumnInsert =
  Database['public']['Tables']['board_columns']['Insert'];
export type BoardColumnUpdate =
  Database['public']['Tables']['board_columns']['Update'];

export type Task = Database['public']['Tables']['tasks']['Row'];

export interface TaskWithAssignee extends Task {
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface BoardColumnWithTasks extends BoardColumn {
  tasks: TaskWithAssignee[];
  taskCount: number;
}

export type DragItemType = 'Task';

export interface TaskDragData {
  type: DragItemType;
  task: TaskWithAssignee;
}

export interface TaskMoveEvent {
  taskId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  newPosition: number;
}
