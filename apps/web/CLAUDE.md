This is the core TanStack Start web app for Apollo.

## Tooling

- Framework: TanStack Start (Router + Query)
- UI: React 19, Tailwind v4, shadcn/ui components
- Database: Drizzle ORM + Bun SQL (Postgres), Redis
- Authentication: Better Auth with Discord/Twitter OAuth
- Search: Typesense for fuzzy objekt metadata search
- i18n: Paraglide JS

## Project Structure

- `src/routes/` - TanStack Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Core business logic
  - `env/` - Environment variables for per client/server environment
  - `client/` - Client-only utilities
  - `functions/` - All `createServerFn` definitions
  - `server/` - Server infrastructure + `*.server.ts` helper files (auth, cache, db, middlewares, etc.)
  - `universal/` - Shared types and Zod schemas
  - `queries/` - `queryOptions` only (client-safe, imports server functions from `functions/`)
- `src/hooks/` - Custom React hooks
- `src/styles/` - Tailwind and general styling config
- `messages/` - Paraglide JS translation strings
- `drizzle/` - Database migrations

## Documentation

Detailed conventions live in `docs/` at the repo root. Read the relevant file **before** working in that area:

| When you're working on… | Read |
| --- | --- |
| Database queries, schema, migrations, derived/projection types | [`docs/database.md`](../../docs/database.md) |
| Routes, loaders, data fetching, server functions, import protection | [`docs/tanstack.md`](../../docs/tanstack.md) |
| Components, forms, Tailwind/styling, i18n strings | [`docs/frontend.md`](../../docs/frontend.md) |
| Throwing/handling errors, `ExpectedError`, Sentry filtering | [`docs/errors.md`](../../docs/errors.md) |

## Development

When writing throwaway scripts for testing, use the `apps/web/tmp` directory. The contents has been put into `.gitignore` - nothing in here should be committed. Always delete once done.
