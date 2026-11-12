'use client';

import * as React from 'react';
import { Search, Archive, Layers, FolderKanban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MilestoneWithDetails } from '@/features/milestones/types/milestone.types';
import type { ProjectWithProgress } from '@/features/projects/types/project.types';
import { ArchivedMilestoneCard } from './archived-milestone-card';
import { ArchivedProjectCard } from './archived-project-card';

interface ArchiveViewProps {
  milestones: MilestoneWithDetails[];
  projects: ProjectWithProgress[];
  isLeader: boolean;
}

export function ArchiveView({
  milestones,
  projects,
  isLeader,
}: ArchiveViewProps) {
  const [activeTab, setActiveTab] = React.useState<'milestones' | 'projects'>(
    'milestones'
  );
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredMilestones = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return milestones;
    return milestones.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [milestones, searchQuery]);

  const filteredProjects = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.team && p.team.name.toLowerCase().includes(q)) ||
        (p.milestone && p.milestone.title.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Tab Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('milestones');
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              activeTab === 'milestones'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Milestones Terarsip</span>
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold">
              {milestones.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              activeTab === 'projects'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Projects Terarsip</span>
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold">
              {projects.length}
            </span>
          </button>
        </div>

        {/* Instant Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === 'milestones'
                ? 'Cari milestone terarsip...'
                : 'Cari project terarsip...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {/* Tab 1: Milestones Content */}
      {activeTab === 'milestones' && (
        <div>
          {milestones.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
              <Archive className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Tidak Ada Milestone Terarsip
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Semua milestone saat ini berada dalam daftar aktif. Anda dapat
                mengarsipkan milestone yang telah tuntas melalui halaman detail
                milestone.
              </p>
            </div>
          ) : filteredMilestones.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Tidak ditemukan milestone yang cocok dengan &quot;{searchQuery}
                &quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Hapus Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMilestones.map((milestone) => (
                <ArchivedMilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  isLeader={isLeader}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Projects Content */}
      {activeTab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
              <Archive className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Tidak Ada Project Terarsip
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Semua project saat ini aktif. Anda dapat mengarsipkan project
                melalui halaman detail project.
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Tidak ditemukan project yang cocok dengan &quot;{searchQuery}
                &quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Hapus Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ArchivedProjectCard
                  key={project.id}
                  project={project}
                  isLeader={isLeader}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
