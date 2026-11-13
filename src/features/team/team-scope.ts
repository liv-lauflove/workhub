export interface ScopedTeamSummary {
  id: string;
  name: string;
}

export interface TeamPageScope<T extends ScopedTeamSummary> {
  currentTab: string;
  isOverview: boolean;
  targetTeam: T | undefined;
}

/**
 * Resolve the authorized `/team` view scope for the signed-in user.
 * Non-Management users are strictly restricted to their own team.
 */
export function resolveTeamPageScope<T extends ScopedTeamSummary>(params: {
  isManagement: boolean;
  userTeamId: string | null | undefined;
  requestedTeam?: string | null;
  teams: T[];
}): TeamPageScope<T> {
  const { isManagement, userTeamId, requestedTeam, teams } = params;

  if (!isManagement) {
    const ownTeam = userTeamId
      ? teams.find((t) => t.id === userTeamId)
      : undefined;
    return {
      currentTab: ownTeam?.id ?? userTeamId ?? '',
      isOverview: false,
      targetTeam: ownTeam,
    };
  }

  const currentTab = requestedTeam?.trim() || 'all';
  if (currentTab === 'all') {
    return {
      currentTab: 'all',
      isOverview: true,
      targetTeam: undefined,
    };
  }

  const normalizedTab = currentTab.toLowerCase();
  const targetTeam = teams.find(
    (t) => t.id === currentTab || t.name.toLowerCase() === normalizedTab
  );

  return {
    currentTab,
    isOverview: !targetTeam,
    targetTeam,
  };
}
