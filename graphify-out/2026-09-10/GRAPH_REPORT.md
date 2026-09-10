# Graph Report - workhub (2026-09-10)

## Corpus Check

- 95 files · ~21,590 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 438 nodes · 537 edges · 50 communities (39 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `6ca8f95e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- Product Requirements Document (PRD)
- docs/README.md
- compilerOptions
- devDependencies
- package.json
- 9. Functional Requirements
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
- invite-modal.tsx
- login-form.tsx
- Folder Structure & Clean Architecture
- layout.tsx
- site.ts
- capacity.utils.ts
- feature-flags.ts
- common.ts
- global.d.ts
- prompt-templates.ts
- dashboard.types.ts
- seed.mjs

## God Nodes (most connected - your core abstractions)

1. `createClient()` - 25 edges
2. `Product Requirements Document (PRD)` - 23 edges
3. `compilerOptions` - 16 edges
4. `9. Functional Requirements` - 16 edges
5. `getUserProfile()` - 10 edges
6. `scripts` - 8 edges
7. `Button()` - 8 edges
8. `Database` - 8 edges
9. `getUser()` - 7 edges
10. `include` - 7 edges

## Surprising Connections (you probably didn't know these)

- `InviteModal()` --references--> `react` [EXTRACTED]
  src/features/team/components/invite-modal.tsx → package.json
- `RevokeButton()` --indirect_call--> `revokeInvitation()` [INFERRED]
  src/features/team/components/invitation-list.tsx → src/features/team/actions/team.actions.ts
- `GET()` --calls--> `createClient()` [EXTRACTED]
  src/app/(auth)/auth/callback/route.ts → src/lib/supabase/server.ts
- `login()` --calls--> `createClient()` [EXTRACTED]
  src/features/auth/actions/auth.actions.ts → src/lib/supabase/server.ts
- `LoginForm()` --indirect_call--> `login()` [INFERRED]
  src/features/auth/components/login-form.tsx → src/features/auth/actions/auth.actions.ts

## Import Cycles

- None detected.

## Communities (50 total, 11 thin omitted)

### Community 0 - "Product Requirements Document (PRD)"

Cohesion: 0.09
Nodes (22): 10. Matriks Hak Akses, 11. Non-Functional Requirements, 12. Model Data, 13. Alur Pengguna Utama, 14. Daftar Halaman / Layar, 15. Rencana Rilis & Timeline, 16. Risiko & Mitigasi, 17. Dependensi & Asumsi (+14 more)

### Community 1 - "docs/README.md"

Cohesion: 0.06
Nodes (27): AI Agent Guidelines, Do's, Don'ts, Database Schema, Entity Relationship Diagram (ERD), Row Level Security (RLS), 1. Entity Relationship Diagram (ERD), 2.1 Alur Task Normal (dibuat → selesai) (+19 more)

### Community 2 - "compilerOptions"

Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/\*.mts, .next/dev/types/**/_.ts, next-env.d.ts, .next/types/\**/_.ts, node_modules (+20 more)

### Community 3 - "devDependencies"

Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, eslint-config-prettier, husky, lint-staged, devDependencies, eslint, eslint-config-next (+19 more)

### Community 4 - "package.json"

Cohesion: 0.12
Nodes (17): lint-staged, *.{js,jsx,ts,tsx}, *.{json,css,md}, name, packageManager, private, scripts, build (+9 more)

### Community 5 - "9. Functional Requirements"

Cohesion: 0.12
Nodes (16): 9.10 Manajemen Anggota Tim, 9.11 Attachment & Search, 9.12 Task Dependencies, 9.13 Export Laporan, 9.14 AI Guardrails, 9.15 Archiving, 9.1 Autentikasi & Manajemen Pengguna, 9.2 Milestone Management (+8 more)

### Community 6 - "createClient"

Cohesion: 0.10
Nodes (27): GET(), DashboardLayout(), metadata, TeamPage(), ROUTES, requireAuth(), getUser(), getUserProfile() (+19 more)

### Community 7 - "auth.actions.ts"

Cohesion: 0.15
Nodes (14): Header(), HeaderProps, emptySubscribe(), MobileNav(), MobileNavProps, ICON_MAP, NAV_ITEMS, Sidebar() (+6 more)

### Community 8 - "dependencies"

Cohesion: 0.07
Nodes (28): @base-ui/react, class-variance-authority, cn, lucide-react, next, dependencies, @base-ui/react, class-variance-authority (+20 more)

### Community 9 - "README.md"

Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 13 - "components.json"

Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 17 - "database.types.ts"

Cohesion: 0.07
Nodes (26): BoardColumn, BoardColumnInsert, Milestone, MilestoneInsert, MilestoneUpdate, Project, ProjectInsert, ProjectUpdate (+18 more)

### Community 18 - "invite-modal.tsx"

Cohesion: 0.22
Nodes (10): Button(), buttonVariants, Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle() (+2 more)

### Community 19 - "login-form.tsx"

Cohesion: 0.12
Nodes (19): metadata, metadata, SubmitButton(), SubmitButtonProps, Card(), CardContent(), CardDescription(), CardFooter() (+11 more)

### Community 20 - "Folder Structure & Clean Architecture"

Cohesion: 0.22
Nodes (8): 1. Prinsip Utama Arsitektur, 2. Struktur Direktori Lengkap (`src/`), 3. Pola Komponen & Pemisahan Boundaries, 4. Keamanan & Proteksi Sesi, Folder Structure & Clean Architecture, Isolasi Server Code (`server-only`), Mutasi Data via Server Actions, Server Components vs Client Components

### Community 21 - "layout.tsx"

Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

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

- **212 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `InviteModal()` connect `dependencies` to `invite-modal.tsx`, `createClient`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Requirements Document (PRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
