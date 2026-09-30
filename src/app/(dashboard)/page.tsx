import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getDashboardPerformance } from '@/features/dashboard/queries/dashboard.queries';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

import type { QuarterFilter } from '@/features/dashboard/types/dashboard.types';

export const metadata: Metadata = {
  title: 'Dashboard Performa — Workhub',
  description:
    'Pemantauan performa kuartalan, progres tugas, dan kapasitas kerja tim.',
};

interface DashboardPageProps {
  searchParams: Promise<{
    q?: string;
    year?: string;
    teamId?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  // 1. Resolve URL search params (Next.js 16 async searchParams)
  const resolvedParams = await searchParams;

  const parsedQ = resolvedParams.q ? parseInt(resolvedParams.q, 10) : undefined;
  const quarter =
    parsedQ && [1, 2, 3, 4].includes(parsedQ)
      ? (parsedQ as 1 | 2 | 3 | 4)
      : undefined;

  const parsedYear = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : undefined;
  const year =
    parsedYear && !isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : undefined;

  const filters: QuarterFilter | undefined =
    quarter || year ? { quarter, year } : undefined;

  // 2. Fetch aggregate performance data filtered by quarter/year
  const dashboardData = profile.team_id
    ? await getDashboardPerformance(profile.team_id, filters)
    : null;

  return <DashboardView initialData={dashboardData} />;
}
