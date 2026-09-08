# Supabase & Database Rules

- Mandatory: Use `@supabase/ssr` for database access and auth.
- Avoid using heavy ORMs (like Prisma) unless explicitly requested by the user.
- Prefer raw queries or Supabase RPCs/typed client for optimal performance.
