# Infrastructure & CI/CD

## Supabase Setup
- Use `@supabase/ssr` for server-side rendering support with Supabase.
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## CI/CD Pipeline
- Pull Requests to `dev` must pass `npm run lint` and `npm run build`.
- Merging to `master` triggers production deployment.
