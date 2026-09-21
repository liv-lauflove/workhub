/**
 * Type-safe route constants for the application.
 * Use these instead of hardcoding paths.
 */
export const ROUTES = {
  // Auth
  login: '/login',
  register: '/register',
  authCallback: '/auth/callback',

  // Dashboard
  dashboard: '/',
  myTasks: '/tasks',
  tasks: '/tasks',
  milestones: '/milestones',
  milestone: (id: string) => `/milestones/${id}` as const,
  projects: (milestoneId?: string) =>
    milestoneId
      ? (`/projects?milestone_id=${milestoneId}` as const)
      : ('/projects' as const),
  project: (id: string) => `/projects/${id}` as const,
  task: (id: string) => `/tasks/${id}` as const,
  team: '/team',
  workload: '/workload',
  settings: '/settings',
  notifications: '/notifications',
  archive: '/archive',
} as const;
