import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { getTeamWorkload } from '@/features/workload/queries/workload.queries';
import { WorkloadView } from '@/features/workload/components/workload-view';

export const metadata: Metadata = {
  title: 'Workload & Kapasitas — Workhub',
  description:
    'Pantau beban kerja dan kapasitas tim berdasarkan bobot prioritas task aktif.',
};

export default async function WorkloadPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const workload = profile.team_id
    ? await getTeamWorkload(profile.team_id)
    : null;

  return <WorkloadView initialWorkload={workload} userRole={profile.role} />;
}
