import * as React from 'react';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSettingsData } from '@/features/profile/queries/profile.queries';
import { ProfileInfoCard } from '@/features/profile/components/profile-info-card';
import { GitHubLinkCard } from '@/features/profile/components/github-link-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/config/routes';

export const metadata: Metadata = {
  title: 'Pengaturan Profil - Workhub',
  description: 'Pengaturan profil pengguna dan integrasi akun GitHub.',
};

function GitHubLinkCardFallback() {
  return (
    <div className="rounded-xl border border-border/70 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export default async function SettingsPage() {
  const settingsData = await getSettingsData();

  if (!settingsData) {
    redirect(ROUTES.login);
  }

  const { profile, user, githubIntegration } = settingsData;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Pengaturan Profil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola informasi akun Anda dan tautkan identitas GitHub untuk
          integrasi otomatis.
        </p>
      </div>

      {/* Profile & GitHub Integration Sections */}
      <div className="space-y-6">
        {/* 1. Personal Profile Information */}
        <ProfileInfoCard profile={profile} userEmail={user.email} />

        {/* 2. GitHub Account Linking Card (Issue #39) */}
        <Suspense fallback={<GitHubLinkCardFallback />}>
          <GitHubLinkCard
            key={profile.github_username || 'unlinked'}
            initialGitHubUsername={profile.github_username}
            initialConnectedAt={githubIntegration?.connected_at}
            userEmail={user.email}
          />
        </Suspense>
      </div>
    </div>
  );
}
