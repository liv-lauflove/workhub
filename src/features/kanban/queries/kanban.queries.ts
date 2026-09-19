import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  BoardColumnWithTasks,
  TaskWithAssignee,
} from '../types/kanban.types';

const DEFAULT_COLUMNS = [
  { name: 'To Do', position: 0, is_default: true },
  { name: 'In Progress', position: 1, is_default: false },
  { name: 'Review', position: 2, is_default: false },
  { name: 'Done', position: 3, is_default: false },
];

/**
 * Fetch all board columns for a specific project with their tasks.
 * If a project has no columns yet, standard default columns (To Do, In Progress, Review, Done)
 * will be automatically provisioned for it.
 */
export async function getProjectBoardColumns(
  projectId: string
): Promise<BoardColumnWithTasks[]> {
  const supabase = await createClient();

  // 1. Fetch columns for this project
  const { data: initialColumns, error: colError } = await supabase
    .from('board_columns')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  let columns = initialColumns;

  if (colError) {
    console.error(`Error fetching columns for project ${projectId}:`, colError);
    return [];
  }

  // 2. If project has no columns, provision default ones
  if (!columns || columns.length === 0) {
    const admin = createAdminClient();
    const newColumnsToInsert = DEFAULT_COLUMNS.map((col) => ({
      project_id: projectId,
      name: col.name,
      position: col.position,
      is_default: col.is_default,
    }));

    const { data: insertedCols, error: insertError } = await admin
      .from('board_columns')
      .insert(newColumnsToInsert)
      .select('*')
      .order('position', { ascending: true });

    if (insertError) {
      console.error(
        `Failed to provision default columns for project ${projectId}:`,
        insertError
      );
      return [];
    }

    columns = insertedCols || [];
  }

  // 3. Fetch tasks for this project
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select(
      '*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (taskError) {
    console.warn(`Error fetching tasks for project ${projectId}:`, taskError);
  }

  const allTasks = (tasks as unknown as TaskWithAssignee[]) || [];

  // 4. Map tasks into respective columns
  return columns.map((column) => {
    const colTasks = allTasks.filter((t) => t.column_id === column.id);
    return {
      ...column,
      tasks: colTasks,
      taskCount: colTasks.length,
    };
  });
}
