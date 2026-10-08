'use client';

import * as React from 'react';
import { CircleDot, GitPullRequest, Kanban, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { KanbanBoard } from '@/features/kanban/components/kanban-board';
import { ProjectIssuesList, isTaskClosed } from './project-issues-list';
import {
  ProjectPullRequestsList,
  isTaskPullRequest,
  isPullRequestOpen,
} from './project-pull-requests-list';
import type { BoardColumnWithTasks } from '@/features/kanban/types/kanban.types';
import type { TeamMemberOption } from '@/features/tasks/components/task-assignee-selector';

interface ProjectTasksViewProps {
  projectId: string;
  columns: BoardColumnWithTasks[];
  teamMembers: TeamMemberOption[];
  currentUserId?: string;
  canCreateTask?: boolean;
}

const STORAGE_KEY = 'workhub_project_active_tab';

type TabType = 'tasks' | 'pull_requests' | 'kanban';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): TabType {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'kanban' || val === 'pull_requests') return val;
    return 'tasks';
  } catch {
    return 'tasks';
  }
}

function getServerSnapshot(): TabType {
  return 'tasks';
}

export function ProjectTasksView({
  projectId,
  columns,
  teamMembers,
  currentUserId,
  canCreateTask = true,
}: ProjectTasksViewProps) {
  const [internalTab, setInternalTab] = React.useState<TabType | null>(null);
  const storedTab = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const activeTab = internalTab ?? storedTab;

  const handleTabChange = (tab: TabType) => {
    setInternalTab(tab);
    try {
      localStorage.setItem(STORAGE_KEY, tab);
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

  // Filter tasks that are in the Pull Request workflow
  const prTasks = React.useMemo(() => {
    return allTasks.filter(isTaskPullRequest);
  }, [allTasks]);

  const openPrCount = React.useMemo(
    () => prTasks.filter((t) => isPullRequestOpen(t)).length,
    [prTasks]
  );

  return (
    <div className="space-y-4">
      {/* Top GitHub Navigation Bar: Task vs Pull request vs Kanban */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-1">
        <div className="flex items-center gap-4 -mb-[5px] overflow-x-auto">
          {/* GitHub Tab 1: Task */}
          <button
            type="button"
            onClick={() => handleTabChange('tasks')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'tasks'
                ? 'border-emerald-600 text-foreground font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <CircleDot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Task</span>
            <span className="rounded-full bg-muted border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {openCount}
            </span>
          </button>

          {/* GitHub Tab 2: Pull request */}
          <button
            type="button"
            onClick={() => handleTabChange('pull_requests')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'pull_requests'
                ? 'border-purple-600 text-foreground font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <GitPullRequest className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Pull request</span>
            <span className="rounded-full bg-muted border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {openPrCount}
            </span>
          </button>

          {/* GitHub Tab 3: Kanban */}
          <button
            type="button"
            onClick={() => handleTabChange('kanban')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'kanban'
                ? 'border-blue-600 text-foreground font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Kanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Kanban</span>
            <span className="rounded-full bg-muted border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {allTasks.length}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 pb-2">
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
      {activeTab === 'tasks' && (
        <ProjectIssuesList
          tasks={allTasks}
          teamMembers={teamMembers}
          columns={columns.map((c) => ({ id: c.id, name: c.name }))}
          currentUserId={currentUserId}
        />
      )}

      {activeTab === 'pull_requests' && (
        <ProjectPullRequestsList
          tasks={allTasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
        />
      )}

      {activeTab === 'kanban' && (
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
