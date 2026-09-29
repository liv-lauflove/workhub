/**
 * Types and interfaces for the Performance Dashboard (PRD §9.5, Issue #30).
 */

import type { PriorityLevel } from '@/features/workload/types/workload.types';

export type QuarterFilter = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  teamId?: string;
};

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number; // percentage 0 - 100
  totalProjects: number;
  activeProjects: number;
  totalMilestones: number;
  overloadedMembersCount: number;
  teamCapacityPercentage: number;
  teamMembersCount: number;
}

export interface PriorityDistribution {
  urgent: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface DashboardRecentTask {
  id: string;
  title: string;
  priority: PriorityLevel;
  dueDate: string | null;
  projectName: string | null;
  projectId: string | null;
  columnName: string;
  assignee: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}

export interface DashboardMemberCapacity {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  capacityPercentage: number;
  totalWeight: number;
  isOverloaded: boolean;
}

export interface CompletionTrendPoint {
  period: string;
  fullLabel: string;
  completed: number;
  created: number;
  cumulativeCompleted: number;
  target: number;
}

export interface CompletionTrendData {
  weekly: CompletionTrendPoint[];
  monthly: CompletionTrendPoint[];
  summary: {
    totalCompleted: number;
    weeklyAverage: number;
    completionVelocity: number;
    targetPaceAchieved: boolean;
  };
}

export interface DashboardPerformanceData {
  teamId: string | null;
  teamName: string;
  userRole: string;
  currentQuarter: {
    year: number;
    quarter: number;
    label: string;
  };
  metrics: DashboardMetrics;
  priorityDistribution: PriorityDistribution;
  recentTasks: DashboardRecentTask[];
  memberCapacities: DashboardMemberCapacity[];
  trendData: CompletionTrendData;
}
