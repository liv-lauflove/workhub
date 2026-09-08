# GitFlow & Conventions

## Branching Model
- **`master`** : Production branch (direct commits are prohibited).
- **`dev`** : Main integration branch.
- **Feature/Fix Branches** (created from `dev`):
  - `feat/*` — New features
  - `fix/*` — Bug fixes
  - `chore/*` — Maintenance / dependency updates
  - `infra/*` — Docker / Supabase / CI setup
  - `docs/*` — Documentation changes
  - `refactor/*` — Code refactoring

## Conventional Commits
Format: `<type>(<scope>): <short description in lowercase>`

*Examples:*
- `feat(parent): implement child profile model and local selection`
- `fix(auth): resolve session refresh issue in middleware`
