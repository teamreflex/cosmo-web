The TanStack Start web app. The overview is in [README.md](README.md); conventions are in `docs/` (see the doc map in the root `CLAUDE.md`).

## Layout

| Path                                              | Holds                                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`                                     | File routes; `routes/api/**` are HTTP routes. `src/routeTree.gen.ts` is generated                                          |
| `src/lib/queries/`                                | `queryOptions` and key prefixes only; they call server functions                                                           |
| `src/lib/functions/`                              | Every `createServerFn`, named `$verbNoun`                                                                                  |
| `src/lib/server/`                                 | Server-only code: `*.server.ts` helpers, plus `middlewares.ts` and `db/` (web and indexer clients), which aren't `.server` |
| `src/lib/universal/`                              | Code for both sides: Zod schemas (`schema/`), error registries (`errors/`), pure domain logic, search-param parsers        |
| `src/lib/client/`                                 | Browser-only helpers, error formatters (`errors/`), the auth, chat and Typesense clients                                   |
| `src/lib/env/`                                    | `client.ts` (`VITE_*`, read at build time) and `server.ts` env schemas                                                     |
| `src/components/`, `src/hooks/`, `src/providers/` | React, by domain; `components/ui/` is vendored shadcn/ui                                                                   |
| `messages/`                                       | Paraglide sources for six locales; `src/i18n/` is generated and gitignored                                                 |
| `drizzle/`                                        | Web DB migrations ([migrations.md](../../docs/migrations.md))                                                              |
| `tests/`                                          | `bun test` suites for pure modules ([testing.md](../../docs/testing.md))                                                   |
| `scripts/`                                        | `db:seed` and `db:seed:staff`                                                                                              |
| `main.ts`, `instrument.ts`, `migrate.ts`          | Production server, Sentry preload, migration runner                                                                        |

## Rules

- Browser-reachable code (`components/`, `hooks/`, `providers/`, route components, `lib/queries`, `lib/client`, `lib/universal`) may only `import type` from `lib/server`. The full boundary is in [tanstack.md](../../docs/tanstack.md#client-and-server-module-boundary).
- A file that exports `createServerFn` or `createMiddleware` is never `.server.ts`.
- User-facing refusals throw `ExpectedError` with a registered code ([errors.md](../../docs/errors.md)).
- Every user-visible string is an `m.*` message in all six locales ([frontend.md](../../docs/frontend.md#i18n)).
- Throwaway scripts go in `apps/web/tmp/`, which is gitignored. Delete them when done.

## Where to start

- **New page:** a route in `src/routes/` with `validateSearch`, `loaderDeps`, `loader`, `head: defineHead(...)`, `pendingComponent` and `errorComponent`; a query in `lib/queries/<domain>.ts`; a server function in `lib/functions/<domain>.ts`.
- **New server function:** pick middleware by the identity it needs, put a shared schema in `lib/universal/schema/`, and follow [tanstack.md](../../docs/tanstack.md#server-functions).
- **New refusal:** the checklist in [errors.md](../../docs/errors.md#adding-an-expected-error).
- **New staff or market page:** gate it in `beforeLoad` with `requirePermission()` or `requireMarketAccess()` ([tanstack.md](../../docs/tanstack.md#gating)).
- **New query that depends on the viewer:** put it under a prefix `removeViewerQueries()` clears ([tanstack.md](../../docs/tanstack.md#mutations-and-invalidation)).
- **New external image, script or API origin:** add it to `buildContentSecurityPolicy()` in `main.ts`.
- **New env var:** add it to `lib/env/server.ts`, or `lib/env/client.ts` with a `VITE_` prefix for the browser ([tooling.md](../../docs/tooling.md)).
- **New shadcn component:** the shadcn CLI from `apps/web` ([libraries.md](../../docs/libraries.md)), keeping it on Base UI.
