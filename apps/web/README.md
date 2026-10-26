# web

Apollo's web app, built on TanStack Start: React 19 pages rendered by Bun on the server and hydrated in the browser. It reads its own Postgres database and the indexer's (read-only), caches in Redis, searches objekts through Typesense from the browser, and opens trade chat against [apps/chat](../chat/README.md).

Rules for changing this app are in [CLAUDE.md](CLAUDE.md).

## A request

```
  routes/*.tsx         validateSearch -> beforeLoad gate -> loader
        |              loader: await queryClient.query(...) or stream it
        v
  lib/queries/*.ts     queryOptions -> $fetchX(...)
        |              in-process during SSR, an HTTP RPC from the browser
        v
  lib/functions/*.ts   createServerFn: middleware, Zod validator, handler
        |              indexer DB reads, then a web DB transaction
        v
  component            useSuspenseQuery(the same options)
                       mutations invalidate queries by key prefix
```

The full picture, with the conventions at each step, is in [docs/tanstack.md](../../docs/tanstack.md).

## Running it

From the repo root, after the setup in the root [README](../../README.md):

| Command                             | Does                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `turbo dev --filter web`            | Vite dev server, plus the Docker services the `DEV_*` flags in `.env` select |
| `turbo db:migrate --filter web`     | Applies `drizzle/` migrations to the web DB                                  |
| `turbo preview --filter web`        | Builds and serves the production server (`main.ts`), CSP included            |
| `turbo i18n`                        | Compiles `messages/*.json` into `src/i18n/`; needed before typecheck         |
| `turbo test --filter web`           | The `tests/` suites                                                          |
| `turbo lint typecheck --filter web` | oxlint and `bun check`                                                       |

## Docs

| Topic                                                                       | File                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| Routes, loaders, server functions, invalidation, the client/server boundary | [docs/tanstack.md](../../docs/tanstack.md)               |
| Components, Base UI, forms, Tailwind, i18n                                  | [docs/frontend.md](../../docs/frontend.md)               |
| `ExpectedError`, display, Sentry                                            | [docs/errors.md](../../docs/errors.md)                   |
| Queries and schema                                                          | [docs/database.md](../../docs/database.md)               |
| Sign-in, roles, permissions                                                 | [docs/auth.md](../../docs/auth.md)                       |
| COSMO links, public users, account deletion                                 | [docs/accounts.md](../../docs/accounts.md)               |
| Reports and staff actions                                                   | [docs/moderation.md](../../docs/moderation.md)           |
| Trades and listings                                                         | [docs/trades/overview.md](../../docs/trades/overview.md) |
| Tests                                                                       | [docs/testing.md](../../docs/testing.md)                 |
