'use client';

import * as React from 'react';
import {
  Check,
  Search,
  User as UserIcon,
  UserX,
  Loader2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskAssigneeAction } from '../actions/task.actions';

export interface TeamMemberOption {
  id: string;
  full_name: string;
  role?: string;
  avatar_url?: string | null;
}

interface TaskAssigneeSelectorProps {
  taskId: string;
  projectId?: string | null;
  currentAssignee?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
  teamMembers: TeamMemberOption[];
  variant?: 'card' | 'sidebar';
  onAssigneeChange?: (newAssignee: TeamMemberOption | null) => void;
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarBgColor(name?: string): string {
  if (!name) return 'bg-muted text-muted-foreground';
  const colors = [
    'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30',
    'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function TaskAssigneeSelector({
  taskId,
  projectId,
  currentAssignee,
  teamMembers,
  variant = 'card',
  onAssigneeChange,
  className = '',
}: TaskAssigneeSelectorProps) {
  const [prevAssignee, setPrevAssignee] = React.useState(currentAssignee);
  const [selectedAssignee, setSelectedAssignee] = React.useState<
    TeamMemberOption | null | undefined
  >(currentAssignee);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Sync prop changes without useEffect setState
  if (currentAssignee !== prevAssignee) {
    setPrevAssignee(currentAssignee);
    setSelectedAssignee(currentAssignee);
  }

  // Handle outside click & escape key
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredMembers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [teamMembers, searchQuery]);

  const handleSelect = (member: TeamMemberOption | null) => {
    const previous = selectedAssignee;
    setSelectedAssignee(member);
    onAssigneeChange?.(member);
    setIsOpen(false);
    setSearchQuery('');

    startTransition(async () => {
      const res = await updateTaskAssigneeAction({
        taskId,
        assigneeId: member ? member.id : null,
        projectId: projectId || '',
      });

      if (res.success) {
        if (member) {
          toast.success(`Task berhasil ditugaskan ke ${member.full_name}`);
        } else {
          toast.success('Penugasan task telah dihapus (Unassigned)');
        }
      } else {
        setSelectedAssignee(previous);
        onAssigneeChange?.(previous || null);
        const errMsg =
          res.error?._form?.[0] || 'Gagal memperbarui penugasan task.';
        toast.error(errMsg);
      }
    });
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPending) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
    }
  };

  // --- RENDER VARIANT: SIDEBAR ---
  if (variant === 'sidebar') {
    return (
      <div className={`relative ${className}`} ref={containerRef}>
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            <span>Assignees</span>
          </div>

          <button
            type="button"
            onClick={toggleDropdown}
            disabled={isPending}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            title="Ubah Penanggung Jawab"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Settings className="h-3 w-3" />
            )}
            <span>Ubah</span>
          </button>
        </div>

        {/* Current Assignee Display (Clickable) */}
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={isPending}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60 group"
        >
          {selectedAssignee ? (
            <>
              {selectedAssignee.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAssignee.avatar_url}
                  alt={selectedAssignee.full_name}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-border shrink-0"
                />
              ) : (
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold shrink-0 ${getAvatarBgColor(
                    selectedAssignee.full_name
                  )}`}
                >
                  {getInitials(selectedAssignee.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {selectedAssignee.full_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedAssignee.role
                    ? `Role: ${selectedAssignee.role}`
                    : 'Penanggung Jawab (PIC)'}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/80 py-1">
              <UserX className="h-4 w-4 text-muted-foreground/60" />
              <span className="italic">
                Belum ada penanggung jawab (Klik untuk menetapkan)
              </span>
            </div>
          )}
        </button>

        {/* ComboBox Popover */}
        {isOpen && (
          <div className="absolute left-0 mt-1.5 z-50 w-64 origin-top-left rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95">
            {/* Search Input */}
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari anggota tim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Members List */}
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {/* Unassigned Option */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left ${
                  !selectedAssignee
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted border text-muted-foreground">
                    <UserX className="h-3 w-3" />
                  </div>
                  <span>Unassigned</span>
                </div>
                {!selectedAssignee && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </button>

              <div className="my-1 border-t border-border/50" />

              {filteredMembers.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  Tidak ada anggota yang cocok
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedAssignee?.id === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelect(member)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="h-5 w-5 rounded-full object-cover shrink-0 ring-1 ring-border"
                          />
                        ) : (
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold shrink-0 ${getAvatarBgColor(
                              member.full_name
                            )}`}
                          >
                            {getInitials(member.full_name)}
                          </div>
                        )}
                        <span className="truncate">{member.full_name}</span>
                        {member.role && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground capitalize">
                            {member.role}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER VARIANT: CARD (FOR KANBAN CARD) ---
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Clickable Card Assignee Avatar */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={isPending}
        className="flex items-center gap-1.5 max-w-[150px] min-w-0 rounded-md p-1 -m-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
        title={
          selectedAssignee
            ? `Ditugaskan kepada: ${selectedAssignee.full_name} (Klik untuk ganti)`
            : 'Belum ditugaskan (Klik untuk menetapkan)'
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : selectedAssignee ? (
          <>
            {selectedAssignee.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedAssignee.avatar_url}
                alt={selectedAssignee.full_name}
                className="h-5 w-5 rounded-full object-cover shrink-0 border ring-1 ring-background"
              />
            ) : (
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold shrink-0 ${getAvatarBgColor(
                  selectedAssignee.full_name
                )}`}
                aria-hidden="true"
              >
                {getInitials(selectedAssignee.full_name)}
              </div>
            )}
            <span className="truncate text-[11px] font-medium text-foreground">
              {selectedAssignee.full_name}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors">
            <UserIcon className="h-3.5 w-3.5" />
            <span>Unassigned</span>
          </div>
        )}
      </button>

      {/* ComboBox Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-1.5 z-50 w-56 origin-bottom-right rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-1.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1.5">
            Tugaskan Kepada
          </div>

          {/* Search Input */}
          <div className="relative mb-1.5">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari anggota tim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Members List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {/* Unassigned Option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors text-left ${
                !selectedAssignee
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted border text-muted-foreground">
                  <UserX className="h-2.5 w-2.5" />
                </div>
                <span>Unassigned</span>
              </div>
              {!selectedAssignee && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </button>

            <div className="my-1 border-t border-border/50" />

            {filteredMembers.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-muted-foreground">
                Tidak ada anggota cocok
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedAssignee?.id === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-4 w-4 rounded-full object-cover shrink-0 ring-1 ring-border"
                        />
                      ) : (
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold shrink-0 ${getAvatarBgColor(
                            member.full_name
                          )}`}
                        >
                          {getInitials(member.full_name)}
                        </div>
                      )}
                      <span className="truncate">{member.full_name}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
