'use client';

import * as React from 'react';
import { AlignLeft, LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { KanbanBoard } from '@/features/kanban/components/kanban-board';
import { ProjectIssuesList, isTaskClosed } from './project-issues-list';
import type { BoardColumnWithTasks } from '@/features/kanban/types/kanban.types';
import type { TeamMemberOption } from '@/features/tasks/components/task-assignee-selector';

interface ProjectTasksViewProps {
  projectId: string;
  columns: BoardColumnWithTasks[];
  teamMembers: TeamMemberOption[];
  currentUserId?: string;
  canCreateTask?: boolean;
}

const STORAGE_KEY = 'workhub_project_view_mode';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): 'list' | 'board' {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

function getServerSnapshot(): 'list' | 'board' {
  return 'list';
}

export function ProjectTasksView({
  projectId,
  columns,
  teamMembers,
  currentUserId,
  canCreateTask = true,
}: ProjectTasksViewProps) {
  const [internalViewMode, setInternalViewMode] = React.useState<
    'list' | 'board' | null
  >(null);
  const storedViewMode = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const viewMode = internalViewMode ?? storedViewMode;

  const handleViewChange = (mode: 'list' | 'board') => {
    setInternalViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  // Flatten all tasks across board columns
  const allTasks = React.useMemo(() => {
    return columns.flatMap((col) => col.tasks);
  }, [columns]);

  const openCount = React.useMemo(
    () => allTasks.filter((t) => !isTaskClosed(t)).length,
    [allTasks]
  );
  const closedCount = React.useMemo(
    () => allTasks.filter((t) => isTaskClosed(t)).length,
    [allTasks]
  );

  return (
    <div className="space-y-4">
      {/* View Switcher Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Task & Isu Project
            </h2>
            <span className="rounded-full bg-muted border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {allTasks.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {openCount} task terbuka · {closedCount} selesai
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Segmented View Switcher: List View vs Board (Kanban) View */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tampilan Daftar Bergaya GitHub Issues"
            >
              <AlignLeft className="h-3.5 w-3.5" />
              <span>List</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('board')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tampilan Papan Kanban Kolom"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
          </div>

          {/* New Task Trigger Button (Rendered only for project team members or management) */}
          {canCreateTask && (
            <CreateTaskDialog
              projectId={projectId}
              columns={columns.map((c) => ({ id: c.id, name: c.name }))}
              teamMembers={teamMembers.map((m) => ({
                id: m.id,
                full_name: m.full_name,
                role: m.role || 'member',
                avatar_url: m.avatar_url,
              }))}
              triggerButton={
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  <span>New task</span>
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <ProjectIssuesList
          tasks={allTasks}
          teamMembers={teamMembers}
          columns={columns.map((c) => ({ id: c.id, name: c.name }))}
          currentUserId={currentUserId}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Geser kartu secara horizontal atau drag-and-drop antar kolom untuk
              memperbarui tahap pengerjaan.
            </span>
          </div>
          <KanbanBoard
            columns={columns}
            projectId={projectId}
            teamMembers={teamMembers}
          />
        </div>
      )}
    </div>
  );
}
