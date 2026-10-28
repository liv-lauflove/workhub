import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AiOverrideRecord {
  id: string;
  taskId: string;
  suggestedPriority: string | null;
  suggestedDurationHours: number | null;
  finalPriority: string | null;
  finalDurationHours: number | null;
  overriddenBy: string | null;
  createdAt: string;
}

export interface AiOverrideStats {
  totalOverrides: number;
  bySuggestedPriority: Record<string, number>;
  byFinalPriority: Record<string, number>;
  recentOverrides: Array<AiOverrideRecord & { taskTitle?: string }>;
}

export interface RecordAiOverrideParams {
  taskId: string;
  suggestedPriority: string;
  finalPriority: string;
  suggestedDurationHours?: number | null;
  finalDurationHours?: number | null;
  overriddenBy: string;
}

/**
 * Records an AI suggestion override to `public.ai_suggestion_overrides`.
 * Non-blocking: attempts standard client first (respects RLS for leader role),
 * falling back to admin client if necessary to ensure telemetry integrity.
 */
export async function recordAiSuggestionOverride(
  params: RecordAiOverrideParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const payload = {
      task_id: params.taskId,
      suggested_priority: params.suggestedPriority,
      suggested_duration_hours: params.suggestedDurationHours ?? null,
      final_priority: params.finalPriority,
      final_duration_hours: params.finalDurationHours ?? null,
      overridden_by: params.overriddenBy,
    };

    const { data, error } = await supabase
      .from('ai_suggestion_overrides')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      // Fallback to admin client if RLS check fails (e.g. system or role permissions)
      const adminSupabase = createAdminClient();
      const { data: adminData, error: adminError } = await adminSupabase
        .from('ai_suggestion_overrides')
        .insert(payload)
        .select('id')
        .single();

      if (adminError) {
        console.warn(
          '[AI Override] Failed to insert override log:',
          adminError.message
        );
        return { success: false, error: adminError.message };
      }
      return { success: true, id: adminData?.id };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown override logging error';
    console.warn('[AI Override] Exception logging override:', message);
    return { success: false, error: message };
  }
}

/**
 * Retrieves aggregate AI override statistics and recent override entries.
 */
export async function getAiOverrideStats(): Promise<AiOverrideStats> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_suggestion_overrides')
      .select(
        `
        id,
        task_id,
        suggested_priority,
        suggested_duration_hours,
        final_priority,
        final_duration_hours,
        overridden_by,
        created_at,
        tasks:task_id (title)
      `
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      return {
        totalOverrides: 0,
        bySuggestedPriority: {},
        byFinalPriority: {},
        recentOverrides: [],
      };
    }

    const bySuggestedPriority: Record<string, number> = {};
    const byFinalPriority: Record<string, number> = {};

    interface RawOverrideRow {
      id: string;
      task_id: string;
      suggested_priority: string | null;
      suggested_duration_hours: number | string | null;
      final_priority: string | null;
      final_duration_hours: number | string | null;
      overridden_by: string | null;
      created_at: string;
      tasks?: { title?: string } | { title?: string }[] | null;
    }

    const rows = data as unknown as RawOverrideRow[];
    const recentOverrides = rows.map((row) => {
      const sp = row.suggested_priority || 'unknown';
      const fp = row.final_priority || 'unknown';
      bySuggestedPriority[sp] = (bySuggestedPriority[sp] || 0) + 1;
      byFinalPriority[fp] = (byFinalPriority[fp] || 0) + 1;

      const taskTitle = Array.isArray(row.tasks)
        ? row.tasks[0]?.title
        : row.tasks?.title;

      return {
        id: row.id,
        taskId: row.task_id,
        suggestedPriority: row.suggested_priority,
        suggestedDurationHours: row.suggested_duration_hours
          ? Number(row.suggested_duration_hours)
          : null,
        finalPriority: row.final_priority,
        finalDurationHours: row.final_duration_hours
          ? Number(row.final_duration_hours)
          : null,
        overriddenBy: row.overridden_by,
        createdAt: row.created_at,
        taskTitle: taskTitle || undefined,
      };
    });

    return {
      totalOverrides: data.length,
      bySuggestedPriority,
      byFinalPriority,
      recentOverrides,
    };
  } catch (err) {
    console.warn('[AI Override] Error fetching override stats:', err);
    return {
      totalOverrides: 0,
      bySuggestedPriority: {},
      byFinalPriority: {},
      recentOverrides: [],
    };
  }
}

/**
 * Retrieves audit log of AI overrides for a specific task.
 */
export async function getTaskAiOverrideLog(
  taskId: string
): Promise<AiOverrideRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_suggestion_overrides')
      .select(
        'id, task_id, suggested_priority, suggested_duration_hours, final_priority, final_duration_hours, overridden_by, created_at'
      )
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      suggestedPriority: row.suggested_priority,
      suggestedDurationHours: row.suggested_duration_hours
        ? Number(row.suggested_duration_hours)
        : null,
      finalPriority: row.final_priority,
      finalDurationHours: row.final_duration_hours
        ? Number(row.final_duration_hours)
        : null,
      overriddenBy: row.overridden_by,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('[AI Override] Error fetching task override log:', err);
    return [];
  }
}
