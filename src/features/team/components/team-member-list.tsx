'use client';

import { useTransition } from 'react';
import { User as UserIcon, Crown, MoreHorizontal } from 'lucide-react';
import { updateMemberRole } from '../actions/team.actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  full_name: string;
  role: 'leader' | 'member';
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
  team_id?: string | null;
}

interface TeamMemberListProps {
  members: TeamMember[];
  isLeader?: boolean;
  teamId?: string;
}

export function TeamMemberList({
  members,
  isLeader = false,
  teamId,
}: TeamMemberListProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (
    member: TeamMember,
    newRole: 'leader' | 'member'
  ) => {
    if (member.role === newRole) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', member.id);
      formData.append('role', newRole);
      formData.append('teamId', member.team_id || teamId || '');

      const result = await updateMemberRole(null, formData);
      if (!result.success) {
        toast.error(result.error?._form?.[0] || 'Gagal mengubah role');
      } else {
        toast.success(
          `Role ${member.full_name} berhasil diubah menjadi ${newRole}`
        );
      }
    });
  };

  if (members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada anggota di tim ini.
      </p>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Anggota</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Bergabung</TableHead>
            {isLeader && (
              <TableHead className="w-[80px] text-right">Aksi</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.full_name}
                    </p>
                    {member.github_username && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{member.github_username}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {member.role === 'leader' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Crown className="h-3 w-3" />
                    Leader
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    Member
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                {new Date(member.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              {isLeader && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isPending}
                      >
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === 'member' ? (
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member, 'leader')}
                        >
                          Jadikan Leader
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member, 'member')}
                        >
                          Jadikan Member
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
