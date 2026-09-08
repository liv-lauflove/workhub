# Graph Report - workhub  (2026-09-08)

## Corpus Check
- 21 files · ~8,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 158 nodes · 145 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a3dbad4`
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
- layout.tsx
- README.md
- AGENTS.md
- graphify.md
- supabase.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Folder Structure & Architecture

## God Nodes (most connected - your core abstractions)
1. `Product Requirements Document (PRD)` - 23 edges
2. `compilerOptions` - 16 edges
3. `9. Functional Requirements` - 16 edges
4. `include` - 7 edges
5. `scripts` - 5 edges
6. `Folder Structure & Architecture` - 5 edges
7. `lib` - 4 edges
8. `Diagram — Task & Performance Dashboard` - 4 edges
9. `2. Activity Diagram` - 4 edges
10. `AI Agent Guidelines` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (19 total, 6 thin omitted)

### Community 0 - "Product Requirements Document (PRD)"
Cohesion: 0.09
Nodes (22): 10. Matriks Hak Akses, 11. Non-Functional Requirements, 12. Model Data, 13. Alur Pengguna Utama, 14. Daftar Halaman / Layar, 15. Rencana Rilis & Timeline, 16. Risiko & Mitigasi, 17. Dependensi & Asumsi (+14 more)

### Community 1 - "docs/README.md"
Cohesion: 0.11
Nodes (13): AI Agent Guidelines, Do's, Don'ts, Database Schema, Entity Relationship Diagram (ERD), Row Level Security (RLS), Branching Model, Conventional Commits (+5 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 4 - "package.json"
Cohesion: 0.12
Nodes (16): next, dependencies, next, react, react-dom, name, packageManager, private (+8 more)

### Community 5 - "9. Functional Requirements"
Cohesion: 0.12
Nodes (16): 9.10 Manajemen Anggota Tim, 9.11 Attachment & Search, 9.12 Task Dependencies, 9.13 Export Laporan, 9.14 AI Guardrails, 9.15 Archiving, 9.1 Autentikasi & Manajemen Pengguna, 9.2 Milestone Management (+8 more)

### Community 6 - "include"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 7 - "2. Activity Diagram"
Cohesion: 0.25
Nodes (7): 1. Entity Relationship Diagram (ERD), 2.1 Alur Task Normal (dibuat → selesai), 2.2 Alur Task dari Komplain Customer Service, 2.3 Alur Leader Menyiapkan Laporan Town Hall, 2. Activity Diagram, 3. Use Case Diagram, Diagram — Task & Performance Dashboard

### Community 8 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 9 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 18 - "Folder Structure & Architecture"
Cohesion: 0.33
Nodes (5): 1. Struktur Folder Next.js App Router, 2. Batas Server vs Client Component, 3. Arsitektur State & Sinkronisasi, 4. Aset Pipeline & File Storage, Folder Structure & Architecture

## Knowledge Gaps
- **109 isolated node(s):** `geistSans`, `geistMono`, `metadata`, `eslintConfig`, `nextConfig` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Product Requirements Document (PRD)` connect `Product Requirements Document (PRD)` to `docs/README.md`, `9. Functional Requirements`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `9. Functional Requirements` connect `9. Functional Requirements` to `Product Requirements Document (PRD)`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `geistSans`, `geistMono`, `metadata` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Requirements Document (PRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._