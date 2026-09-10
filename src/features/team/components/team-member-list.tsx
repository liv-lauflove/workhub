import { User as UserIcon, Crown } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  role: 'leader' | 'member';
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
}

interface TeamMemberListProps {
  members: TeamMember[];
}

export function TeamMemberList({ members }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada anggota di tim ini.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-4 px-4 py-3">
          {/* Avatar */}
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.full_name}
              className="h-9 w-9 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="h-4 w-4" />
            </div>
          )}

          {/* Name & meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{member.full_name}</p>
              {member.role === 'leader' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Crown className="h-3 w-3" />
                  Leader
                </span>
              )}
            </div>
            {member.github_username && (
              <p className="truncate text-xs text-muted-foreground">
                @{member.github_username}
              </p>
            )}
          </div>

          {/* Joined date */}
          <p className="hidden text-xs text-muted-foreground sm:block">
            Bergabung{' '}
            {new Date(member.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
