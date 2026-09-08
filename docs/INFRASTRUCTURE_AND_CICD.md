# Infrastructure & CI/CD

## Database & Backend (Supabase Cloud)

- Project uses **Supabase Cloud** as the single central database and authentication provider (no local Docker required).
- Use `@supabase/ssr` for server-side rendering and Server Actions with Supabase in Next.js App Router.
- Environment variables required (`.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Database Migrations

- All table and schema changes are version-controlled in `supabase/migrations/`.
- Schema changes are applied to Supabase Cloud via SQL Editor or CLI (`pnpm supabase db push`).

## CI/CD Pipeline

- Pull Requests to `dev` must pass `pnpm run lint` and `pnpm run build`.
- Merging to `master` triggers production deployment.
