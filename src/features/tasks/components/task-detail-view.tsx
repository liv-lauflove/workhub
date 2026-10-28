'use client';

import * as React from 'react';
import { TaskDetailHeader } from './task-detail-header';
import { TaskDetailMain } from './task-detail-main';
import { TaskDetailSidebar } from './task-detail-sidebar';
import type { TeamMemberOption } from './task-assignee-selector';
import type { TaskGithubCommit } from '@/features/github/types/github.types';
import type {
  TaskDetail,
  TaskActivityLog,
  TaskAttachmentItem,
} from '../types/task.types';

interface TaskDetailViewProps {
  task: TaskDetail;
  availableColumns: { id: string; name: string; position: number }[];
  teamMembers?: TeamMemberOption[];
  activities?: TaskActivityLog[];
  attachments?: TaskAttachmentItem[];
  commits?: TaskGithubCommit[];
  currentUserId?: string;
  isLeader?: boolean;
}

export function TaskDetailView({
  task,
  availableColumns,
  teamMembers = [],
  activities = [],
  attachments = [],
  commits = [],
  currentUserId,
  isLeader = false,
}: TaskDetailViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* 1. Header Bar (Breadcrumb, Title, Status, Copy Link) */}
      <TaskDetailHeader
        task={task}
        availableColumns={availableColumns}
        teamMembers={teamMembers}
      />

      {/* 2. 2-Column Responsive Layout (GitHub Issue Style) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Content (Left: ~70%) */}
        <main className="lg:col-span-8 space-y-6">
          <TaskDetailMain
            task={task}
            activities={activities}
            attachments={attachments}
            commits={commits}
            availableColumns={availableColumns}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
            isLeader={isLeader}
          />
        </main>

        {/* Sidebar Metadata (Right: ~30%) */}
        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <TaskDetailSidebar
              task={task}
              availableColumns={availableColumns}
              teamMembers={teamMembers}
              commitsCount={commits.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
