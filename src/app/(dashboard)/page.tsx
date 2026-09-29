import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getDashboardPerformance } from '@/features/dashboard/queries/dashboard.queries';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

export const metadata: Metadata = {
  title: 'Dashboard Performa — Workhub',
  description:
    'Pemantauan performa kuartalan, progres tugas, dan kapasitas kerja tim.',
};

export default async function DashboardPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const dashboardData = profile.team_id
    ? await getDashboardPerformance(profile.team_id)
    : null;

  return <DashboardView initialData={dashboardData} />;
}
