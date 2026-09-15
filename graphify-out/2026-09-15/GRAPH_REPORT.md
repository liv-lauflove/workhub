# Graph Report - workhub (2026-09-15)

## Corpus Check

- 117 files · ~30,803 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 541 nodes · 817 edges · 50 communities (38 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `871bad93`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- Product Requirements Document (PRD)
- docs/README.md
- compilerOptions
- devDependencies
- package.json
- team-member-list.tsx
- createClient
- auth.actions.ts
- dependencies
- README.md
- AGENTS.md
- graphify.md
- supabase.md
- components.json
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- database.types.ts
- [id]/page.tsx
- create-project-dialog.tsx
- project-list.tsx
- layout.tsx
- milestone-list.tsx
- site.ts
- capacity.utils.ts
- feature-flags.ts
- common.ts
- global.d.ts
- [id]/projects/page.tsx
- prompt-templates.ts
- dashboard.types.ts
- seed.mjs

## God Nodes (most connected - your core abstractions)

1. `Product Requirements Document (PRD)` - 23 edges
2. `createClient()` - 22 edges
3. `getUserProfile()` - 17 edges
4. `compilerOptions` - 16 edges
5. `9. Functional Requirements` - 16 edges
6. `createAdminClient()` - 14 edges
7. `Button()` - 11 edges
8. `MilestoneDetailPage()` - 9 edges
9. `Database` - 9 edges
10. `scripts` - 8 edges

## Surprising Connections (you probably didn't know these)

- `CopyLinkButton()` --references--> `react` [EXTRACTED]
  src/features/team/components/invitation-list.tsx → package.json
- `CreateMilestoneDialog()` --references--> `react` [EXTRACTED]
  src/features/milestones/components/create-milestone-dialog.tsx → package.json
- `MilestoneList()` --references--> `react` [EXTRACTED]
  src/features/milestones/components/milestone-list.tsx → package.json
- `CreateProjectDialog()` --references--> `react` [EXTRACTED]
  src/features/projects/components/create-project-dialog.tsx → package.json
- `ProjectList()` --references--> `react` [EXTRACTED]
  src/features/projects/components/project-list.tsx → package.json

## Import Cycles

- None detected.

## Communities (50 total, 12 thin omitted)

### Community 0 - "Product Requirements Document (PRD)"

Cohesion: 0.05
Nodes (38): 10. Matriks Hak Akses, 11. Non-Functional Requirements, 12. Model Data, 13. Alur Pengguna Utama, 14. Daftar Halaman / Layar, 15. Rencana Rilis & Timeline, 16. Risiko & Mitigasi, 17. Dependensi & Asumsi (+30 more)

### Community 1 - "docs/README.md"

Cohesion: 0.05
Nodes (35): AI Agent Guidelines, Do's, Don'ts, Database Schema, Entity Relationship Diagram (ERD), Row Level Security (RLS), 1. Entity Relationship Diagram (ERD), 2.1 Alur Task Normal (dibuat → selesai) (+27 more)

### Community 2 - "compilerOptions"

Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/\*.mts, .next/dev/types/**/_.ts, next-env.d.ts, .next/types/\**/_.ts, node_modules (+20 more)

### Community 3 - "devDependencies"

Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, eslint-config-prettier, husky, lint-staged, devDependencies, eslint, eslint-config-next (+19 more)

### Community 4 - "package.json"

Cohesion: 0.12
Nodes (17): lint-staged, *.{js,jsx,ts,tsx}, *.{json,css,md}, name, packageManager, private, scripts, build (+9 more)

### Community 5 - "team-member-list.tsx"

Cohesion: 0.10
Nodes (12): DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuTrigger(), Table(), TableBody(), TableCell(), TableHead() (+4 more)

### Community 6 - "createClient"

Cohesion: 0.09
Nodes (30): GET(), DashboardLayout(), metadata, TeamPage(), getUser(), getUserProfile(), createMilestone(), CreateMilestoneInput (+22 more)

### Community 7 - "auth.actions.ts"

Cohesion: 0.15
Nodes (14): Header(), HeaderProps, emptySubscribe(), MobileNav(), MobileNavProps, ICON_MAP, NAV_ITEMS, Sidebar() (+6 more)

### Community 8 - "dependencies"

Cohesion: 0.07
Nodes (27): @base-ui/react, class-variance-authority, cn, lucide-react, next, dependencies, @base-ui/react, class-variance-authority (+19 more)

### Community 9 - "README.md"

Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 13 - "components.json"

Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 17 - "database.types.ts"

Cohesion: 0.09
Nodes (22): BoardColumn, BoardColumnInsert, Task, TaskComment, TaskInsert, TaskUpdate, useUser(), createClient() (+14 more)

### Community 18 - "[id]/page.tsx"

Cohesion: 0.12
Nodes (32): react, react, generateMetadata(), MilestoneDetailPage(), MilestoneDetailPageProps, STATUS_CONFIG, metadata, MilestonesPage() (+24 more)

### Community 19 - "create-project-dialog.tsx"

Cohesion: 0.09
Nodes (35): metadata, metadata, SubmitButton(), SubmitButtonProps, Button(), buttonVariants, Card(), CardContent() (+27 more)

### Community 20 - "project-list.tsx"

Cohesion: 0.19
Nodes (12): ProjectCard(), ProjectCardProps, STATUS_CONFIG, ProjectListProps, StatusFilter, RawProjectQueryResult, Project, ProjectInsert (+4 more)

### Community 21 - "layout.tsx"

Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 22 - "milestone-list.tsx"

Cohesion: 0.21
Nodes (12): MilestoneCard(), MilestoneCardProps, STATUS_CONFIG, MilestoneListProps, StatusFilter, calculateMilestoneTimeProgress(), formatMilestoneDate(), MilestoneProgressInfo (+4 more)

### Community 27 - "common.ts"

Cohesion: 0.50
Nodes (3): dateRangeSchema, paginationSchema, uuidSchema

### Community 28 - "global.d.ts"

Cohesion: 0.50
Nodes (3): ActionState, PaginationParams, SortDirection

### Community 54 - "seed.mjs"

Cohesion: 0.50
Nodes (3): envPath, seedSql, seedSqlPath

## Knowledge Gaps

- **231 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `[id]/page.tsx`, `package.json`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `react` connect `[id]/page.tsx` to `dependencies`, `createClient`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Requirements Document (PRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
