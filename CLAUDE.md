Apollo is a Bun and Turborepo monorepo; [`README.md`](README.md) lists what each app and package is.

## Documentation

Read the file for an area **before** working in it. Each app and package also has its own `README.md` or `CLAUDE.md`.

| When you're working on…                                                                                                                  | Read                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Turbo tasks, local services and `DEV_*` flags, env vars, lint, format, TypeScript 7, Effect conventions, Redis keys, rate limits, Sentry | [`docs/tooling.md`](docs/tooling.md)                 |
| Looking up library documentation (TanStack, Drizzle, Effect, …)                                                                          | [`docs/libraries.md`](docs/libraries.md)             |
| Writing or running tests (`bun test`), what earns a test                                                                                 | [`docs/testing.md`](docs/testing.md)                 |
| Queries, schema, the two databases, cross-database ids, derived types (`apps/web`, `packages/database`)                                  | [`docs/database.md`](docs/database.md)               |
| Migrations for either database, backfills, hand-applied autovacuum settings                                                              | [`docs/migrations.md`](docs/migrations.md)           |
| Lock order, row locks, deadlocks between writers                                                                                         | [`docs/locking.md`](docs/locking.md)                 |
| Better Auth, sign-in, staff roles and permissions, bans, user events, chat tokens, API keys, display currency                            | [`docs/auth.md`](docs/auth.md)                       |
| COSMO links and verification, what others see of a user, staff names, account deletion                                                   | [`docs/accounts.md`](docs/accounts.md)               |
| Reports, disputes, message reports, staff audit                                                                                          | [`docs/moderation.md`](docs/moderation.md)           |
| Routes, loaders, server functions, middleware, invalidation, import protection (`apps/web`)                                              | [`docs/tanstack.md`](docs/tanstack.md)               |
| Components, forms, Tailwind/styling, i18n strings (`apps/web`)                                                                           | [`docs/frontend.md`](docs/frontend.md)               |
| Throwing/handling errors, `ExpectedError`, error boundaries, Sentry filtering (`apps/web`)                                               | [`docs/errors.md`](docs/errors.md)                   |
| COSMO domain concepts: collections, objekts, serials, grids, COMO, gravity polls                                                         | [`docs/cosmo.md`](docs/cosmo.md)                     |
| Listings, the composer, feed and listing page, trades, offers, the drain's decisions, timers, feedback, the market gate                  | [`docs/trades/overview.md`](docs/trades/overview.md) |

## Commands

- `turbo dev`, `turbo build`, `turbo lint`, `turbo lint:fix`, `turbo format`, `turbo typecheck`, `turbo test`: run the task in every workspace.
- `--filter <workspace>` runs it in one, e.g. `turbo typecheck --filter web` or `turbo test --filter @apollo/trades`.
- `--ui stream` replaces the default TUI with one plain stream; use it in non-interactive sessions.
- `turbo i18n` compiles the web app's messages into `apps/web/src/i18n`, which typecheck needs.
- `turbo db:generate --filter web` and `turbo db:migrate --filter web` generate and apply web database migrations; see [`docs/migrations.md`](docs/migrations.md).
- `turbo db:seed --filter web` and `turbo db:seed:staff --filter web` seed local data and staff accounts.

## Workflow

- Use Bun, never npm or pnpm.
- Lint and typecheck are enough to verify a change; don't run `build` or `dev` for that.
- Check a workspace's `package.json` before adding a package.
- Add a package with `bun add <pkg> --filter <workspace>`, or `bun add <pkg> --catalog` for the root catalog. A root `bun add` without either lands in the root `package.json`.
- Editing a `.ts` or `.tsx` file runs `bun fmt` and `oxlint --type-aware --fix` on it and returns any lint errors, so re-read a file before editing it again.
- Use oxlint and `bun fmt`, never eslint or Prettier.
- Fix an `anti-slop/*` lint error by parsing input at its boundary, not by suppressing it; see [`packages/lint`](packages/lint/README.md).
- TypeScript 7 has no compiler API: don't add tooling that imports `typescript`.

## Project context

Apollo is a blockchain explorer for MODHAUS' COSMO app: it tracks objekts (digital collectibles) and gravities (votes) from on-chain data, and the indexer is the source of truth for who owns what. Domain concepts are in [`docs/cosmo.md`](docs/cosmo.md).

Users never sign in to COSMO through Apollo. A database table holds the access and refresh tokens of one dummy COSMO account, and Apollo proxies only these authenticated APIs through it:

- fetching artist and member information
- fetching gravity polls for candidate lists
- user search
- verifying account ownership by reading profiles

The one exception is share-data: a user scans a COSMO QR code so Apollo can read objekt media it lacks from their collection. That session lives only for the one server call and is never stored.

## Editing docs and CLAUDE.md files

- Docs describe the system, not the changes made to it. When code changes, rewrite the copy for that part of the system so it reads as if it had always worked this way. Never append a sentence explaining what changed or how it differs from before: no "now", "no longer", "previously", "the old X", "also" tacked onto an existing point, dates or PR references.
- If a change makes a section harder to follow, restructure the section instead of adding qualifiers to it.
- One home per fact. Before adding anything, search `docs/` and every `CLAUDE.md` and `README.md` for it. If it exists, fix it there and link to it; never restate it.
- Document only what an agent can't get from the code in a few minutes: invariants, orderings, contracts between apps, gotchas with their why, and where to start for a kind of change. Don't document what `ls`, the type checker, a function's docblock or a library's own docs already say.
- Put a fact in the layer that owns it: `README.md` is the overview for people, root `CLAUDE.md` is the router and the repo-wide rules, an app or package `CLAUDE.md` holds the rules for that directory, `docs/` is reference by topic. Link from the other layers.
- A section is a heading, at most one lead sentence, then bullets, a table or a diagram. A bullet is one fact and at most one "because". No paragraph over three sentences. Prose is never hard-wrapped: one paragraph is one line.
- Use a table for anything that is "X per Y", a fenced ASCII diagram for a flow, an order or a state machine, and a numbered list for a procedure. Diagrams use plain ASCII (`| v + - >`), fit in 100 columns, name real identifiers, and stay under 30 lines.
- Length follows the content. A long file is fine when every section is quick to scan; what isn't fine is a section that only grows. When a `docs/` file covers topics an agent would load separately, split it into a `docs/<topic>/` folder with an `overview.md`.
- Point at code with a `path` or a `symbol()` name, never a line number.
- A doc that disagrees with the code is a bug: fix it in the same change as the code, and delete what the change made wrong.
- No changelogs, no "known issues" lists that are really TODOs, no inventories of files or columns.
