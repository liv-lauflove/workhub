import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MilestoneProjectsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/projects?milestone_id=${id}`);
}
