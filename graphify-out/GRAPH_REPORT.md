# Graph Report - workhub (2026-09-15)

## Corpus Check

- 122 files · ~32,532 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 561 nodes · 875 edges · 51 communities (39 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `6a2ba03c`
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
- milestones/[id]/page.tsx
- create-project-dialog.tsx
- login-form.tsx
- layout.tsx
- milestone-list.tsx
- site.ts
- capacity.utils.ts
- feature-flags.ts
- common.ts
- global.d.ts
- [id]/projects/page.tsx
- kanban.types.ts
- prompt-templates.ts
- dashboard.types.ts
- seed.mjs

## God Nodes (most connected - your core abstractions)

1. `createClient()` - 24 edges
2. `Product Requirements Document (PRD)` - 23 edges
3. `getUserProfile()` - 19 edges
4. `createAdminClient()` - 16 edges
5. `compilerOptions` - 16 edges
6. `9. Functional Requirements` - 16 edges
7. `Button()` - 11 edges
8. `MilestoneDetailPage()` - 9 edges
9. `ROUTES` - 9 edges
10. `Database` - 9 edges

## Surprising Connections (you probably didn't know these)

- `MilestoneList()` --references--> `react` [EXTRACTED]
  src/features/milestones/components/milestone-list.tsx → package.json
- `ProjectList()` --references--> `react` [EXTRACTED]
  src/features/projects/components/project-list.tsx → package.json
- `CopyLinkButton()` --references--> `react` [EXTRACTED]
  src/features/team/components/invitation-list.tsx → package.json
- `RevokeButton()` --indirect_call--> `revokeInvitation()` [INFERRED]
  src/features/team/components/invitation-list.tsx → src/features/team/actions/team.actions.ts
- `CreateMilestoneDialog()` --references--> `react` [EXTRACTED]
  src/features/milestones/components/create-milestone-dialog.tsx → package.json

## Import Cycles

- None detected.

## Communities (51 total, 12 thin omitted)

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

Cohesion: 0.09
Nodes (14): DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuTrigger(), Table(), TableBody(), TableCell(), TableHead() (+6 more)

### Community 6 - "createClient"

Cohesion: 0.16
Nodes (15): GET(), metadata, TeamPage(), createMilestone(), CreateMilestoneInput, createMilestoneSchema, getNotifications(), createProject() (+7 more)

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

Cohesion: 0.07
Nodes (31): ProjectCard(), ProjectCardProps, STATUS_CONFIG, ProjectList(), ProjectListProps, StatusFilter, RawProjectQueryResult, Project (+23 more)

### Community 18 - "milestones/[id]/page.tsx"

Cohesion: 0.12
Nodes (37): DashboardLayout(), generateMetadata(), MilestoneDetailPage(), MilestoneDetailPageProps, STATUS_CONFIG, metadata, MilestonesPage(), generateMetadata() (+29 more)

### Community 19 - "create-project-dialog.tsx"

Cohesion: 0.10
Nodes (31): react, react, Button(), buttonVariants, Dialog(), DialogClose(), DialogContent(), DialogDescription() (+23 more)

### Community 20 - "login-form.tsx"

Cohesion: 0.13
Nodes (17): metadata, metadata, SubmitButton(), SubmitButtonProps, Card(), CardContent(), CardDescription(), CardFooter() (+9 more)

### Community 21 - "layout.tsx"

Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 22 - "milestone-list.tsx"

Cohesion: 0.19
Nodes (13): MilestoneCard(), MilestoneCardProps, STATUS_CONFIG, MilestoneList(), MilestoneListProps, StatusFilter, calculateMilestoneTimeProgress(), formatMilestoneDate() (+5 more)

### Community 27 - "common.ts"

Cohesion: 0.50
Nodes (3): dateRangeSchema, paginationSchema, uuidSchema

### Community 28 - "global.d.ts"

Cohesion: 0.50
Nodes (3): ActionState, PaginationParams, SortDirection

### Community 31 - "kanban.types.ts"

Cohesion: 0.21
Nodes (13): KanbanBoard(), KanbanBoardProps, getColumnStatusDot(), getPriorityBadgeClass(), KanbanColumn(), KanbanColumnProps, DEFAULT_COLUMNS, BoardColumn (+5 more)

### Community 54 - "seed.mjs"

Cohesion: 0.50
Nodes (3): envPath, seedSql, seedSqlPath

## Knowledge Gaps

- **234 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+229 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `create-project-dialog.tsx`, `package.json`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `react` connect `create-project-dialog.tsx` to `dependencies`, `database.types.ts`, `milestone-list.tsx`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _234 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Requirements Document (PRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
