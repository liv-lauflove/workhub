# Graph Report - workhub (2026-09-08)

## Corpus Check

- 32 files · ~13,266 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 262 nodes · 252 edges · 24 communities (17 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `26c981e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- Product Requirements Document (PRD)
- docs/README.md
- compilerOptions
- devDependencies
- package.json
- 9. Functional Requirements
- include
- 2. Activity Diagram
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
- dialog.tsx
- Folder Structure & Architecture
- layout.tsx

## God Nodes (most connected - your core abstractions)

1. `Product Requirements Document (PRD)` - 23 edges
2. `compilerOptions` - 16 edges
3. `9. Functional Requirements` - 16 edges
4. `scripts` - 7 edges
5. `include` - 7 edges
6. `tailwind` - 6 edges
7. `aliases` - 6 edges
8. `Project Setup & Engineering Checklist (4-Month Roadmap)` - 6 edges
9. `Folder Structure & Architecture` - 5 edges
10. `Button()` - 4 edges

## Surprising Connections (you probably didn't know these)

- None detected - all connections are within the same source files.

## Import Cycles

- None detected.

## Communities (24 total, 7 thin omitted)

### Community 0 - "Product Requirements Document (PRD)"

Cohesion: 0.09
Nodes (22): 10. Matriks Hak Akses, 11. Non-Functional Requirements, 12. Model Data, 13. Alur Pengguna Utama, 14. Daftar Halaman / Layar, 15. Rencana Rilis & Timeline, 16. Risiko & Mitigasi, 17. Dependensi & Asumsi (+14 more)

### Community 1 - "docs/README.md"

Cohesion: 0.07
Nodes (20): AI Agent Guidelines, Do's, Don'ts, Database Schema, Entity Relationship Diagram (ERD), Row Level Security (RLS), Branching Model, Conventional Commits (+12 more)

### Community 2 - "compilerOptions"

Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 3 - "devDependencies"

Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, eslint-config-prettier, husky, lint-staged, devDependencies, eslint, eslint-config-next (+19 more)

### Community 4 - "package.json"

Cohesion: 0.12
Nodes (16): lint-staged, *.{js,jsx,ts,tsx}, *.{json,css,md}, name, packageManager, private, scripts, build (+8 more)

### Community 5 - "9. Functional Requirements"

Cohesion: 0.12
Nodes (16): 9.10 Manajemen Anggota Tim, 9.11 Attachment & Search, 9.12 Task Dependencies, 9.13 Export Laporan, 9.14 AI Guardrails, 9.15 Archiving, 9.1 Autentikasi & Manajemen Pengguna, 9.2 Milestone Management (+8 more)

### Community 6 - "include"

Cohesion: 0.20
Nodes (9): **/\*.mts, .next/dev/types/**/_.ts, next-env.d.ts, .next/types/\**/_.ts, node_modules, **/_.ts, \**/_.tsx, exclude (+1 more)

### Community 7 - "2. Activity Diagram"

Cohesion: 0.25
Nodes (7): 1. Entity Relationship Diagram (ERD), 2.1 Alur Task Normal (dibuat → selesai), 2.2 Alur Task dari Komplain Customer Service, 2.3 Alur Leader Menyiapkan Laporan Town Hall, 2. Activity Diagram, 3. Use Case Diagram, Diagram — Task & Performance Dashboard

### Community 8 - "dependencies"

Cohesion: 0.09
Nodes (23): @base-ui/react, class-variance-authority, cn, lucide-react, next, dependencies, @base-ui/react, class-variance-authority (+15 more)

### Community 9 - "README.md"

Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 13 - "components.json"

Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 17 - "database.types.ts"

Cohesion: 0.14
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 20 - "Folder Structure & Architecture"

Cohesion: 0.33
Nodes (5): 1. Struktur Folder Next.js App Router, 2. Batas Server vs Client Component, 3. Arsitektur State & Sinkronisasi, 4. Aset Pipeline & File Storage, Folder Structure & Architecture

### Community 21 - "layout.tsx"

Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

## Knowledge Gaps

- **159 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Product Requirements Document (PRD)` connect `Product Requirements Document (PRD)` to `docs/README.md`, `9. Functional Requirements`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Requirements Document (PRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
