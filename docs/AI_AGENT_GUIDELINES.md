# AI Agent Guidelines

## Do's
- Always follow Conventional Commits.
- Strictly adhere to the GitFlow branching model.
- Write tests and ensure all builds pass before marking tasks as complete.
- Verify errors carefully and prevent hallucination by checking existing codebase context using `graphify`.
- Ensure atomic commits per context.

## Don'ts
- Do not make generic commits.
- Do not mix different contexts in a single PR.
- Avoid using heavy ORMs unless explicitly requested; default to `@supabase/ssr`.
- Do not skip linting (`npm run lint`) and building (`npm run build`).
