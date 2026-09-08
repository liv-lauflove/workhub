/**
 * Site-wide configuration and metadata.
 */
export const siteConfig = {
  name: 'Workhub',
  description: 'Task & Performance Dashboard',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

/**
 * Main navigation items for the sidebar.
 * Icon names reference lucide-react icons.
 */
export const navItems = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Milestones', href: '/milestones', icon: 'Target' },
  { label: 'Team', href: '/team', icon: 'Users' },
  { label: 'Workload', href: '/workload', icon: 'BarChart3' },
  { label: 'Archive', href: '/archive', icon: 'Archive' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;
