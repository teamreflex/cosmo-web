# Tooling

How the monorepo is wired, run locally, linted, formatted and type-checked, plus the conventions and Redis resources the apps share.

## Monorepo

- Workspaces are `apps/*` and `packages/*`. Shared versions live in the root `catalog`, and workspaces depend on them as `catalog:`.
- `better-auth`, `@better-auth/api-key` and `@better-auth/drizzle-adapter` are pinned to one version in the catalog; bump them together.
- `patchedDependencies` patch `@subsquid/http-client` and `@effect/platform-bun` from `patches/`. A patch is keyed by version, so bumping either package means regenerating its patch.
- `bunfig.toml` `[install]`:
  - `linker = "isolated"`: a workspace can only import packages its own `package.json` declares.
  - `minimumReleaseAge` is one day, so a version published less than a day ago won't install (`@types/bun` and `bun-types` are exempt).
  - The Socket scanner checks every install.

| Task                                               | Runs first or alongside                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `typecheck`, `test`                                | `^typecheck`. Neither runs `i18n`; web's own typecheck needs `turbo i18n` first ([frontend.md](frontend.md#i18n)) |
| `lint`, `format`                                   | `^lint`, `^format`                                                                                                |
| `dev` in web, chat, schedules and typesense-import | `with: ["//#services"]`, so each also starts the Docker services                                                  |
| `start`, `preview` in web                          | `with: ["//#services"]`                                                                                           |
| `db:seed`, `db:seed:staff`                         | `//#services`                                                                                                     |

- Run an Effect app either on the host (`turbo dev --filter <app>`) or in Docker through its `DEV_*` flag, never both, because two copies would run the same tasks and consumers.

## Local services

`//#services` is `dotenv -c -- ./start.sh`: with `DEV_SERVICES=true` it runs `docker compose up` for the services below, otherwise it sleeps so `turbo dev` still works without Docker.

| Service             | Host port | Started by      | Notes                                                                                    |
| ------------------- | --------- | --------------- | ---------------------------------------------------------------------------------------- |
| `postgres-web`      | 5435      | always          | direct connection, for drizzle-kit (`DATABASE_URL_UNPOOLED`)                             |
| `pgbouncer-web`     | 5433      | always          | transaction pooling, for the app (`DATABASE_URL`)                                        |
| `postgres-indexer`  | 5434      | always          | direct connection                                                                        |
| `pgbouncer-indexer` | 5432      | always          | transaction pooling (`INDEXER_DATABASE_URL`)                                             |
| `valkey`            | 6379      | always          | Redis                                                                                    |
| `s3proxy`           | 9000      | always          | stands in for R2; bucket `apollo`, public at `localhost:9000/apollo`, no auth, CORS open |
| `browserless`       | 5000      | always          | Chromium over CDP for the share-data reCAPTCHA (`CDP_ENDPOINT`)                          |
| `typesense`         | 8108      | `DEV_TYPESENSE` | CORS allows only `http://localhost:3000`                                                 |
| `processor`         | none      | `DEV_PROCESSOR` | `apps/indexer`; applies the indexer migrations on boot, connects to Postgres directly    |
| `import-server`     | none      | `DEV_IMPORTER`  | `apps/typesense-import`                                                                  |
| `schedules`         | none      | `DEV_SCHEDULES` | `apps/schedules`                                                                         |
| `chat`              | 3001      | `DEV_CHAT`      | `apps/chat`; reaches the host's JWKS through `host.docker.internal`                      |

- The web app always runs on the host.
- Containers get their database, Redis and R2 URLs from `docker-compose.yml`, not from `.env`.

## Environment variables

`.env.example` is the inventory. Host processes read the root `.env` then `.env.local` through each workspace's script (`--env-file`, or `bun run env` in web), never from code.

| App                                       | Validated by                                | Notes                                                                                               |
| ----------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/web` server                         | `apps/web/src/lib/env/server.ts`, at import | an empty string counts as unset; every required variable must be non-empty                          |
| `apps/web` browser                        | `apps/web/src/lib/env/client.ts`            | `VITE_*` only, inlined by Vite at build time: restart dev or rebuild after a change                 |
| `apps/chat`                               | `Config` in each service's `make`           | rules in [`apps/chat/CLAUDE.md`](../apps/chat/CLAUDE.md#running-locally)                            |
| `apps/schedules`                          | `Config` in each service's `make`           | `WEB_DATABASE_URL`, `INDEXER_DATABASE_URL`, `REDIS_URL`, `COSMO_KEY`, `EXCHANGERATE_API_KEY`        |
| `apps/typesense-import`                   | `Config` in each service's `make`           | `LOOP_INTERVAL` in ms, default 10 minutes; on the host nothing sets it, so it ticks at the default  |
| `apps/indexer`                            | `apps/indexer/src/env.ts`                   | `DB_URL`, `RPC_*`, `ENABLE_OBJEKTS`, `ENABLE_GRAVITY`, `COSMO_PARALLEL_COUNT`, `R2_*`, `SENTRY_DSN` |
| `image:mirror`, serial-estimation scripts | zod at the top of each script               | `INDEXER_DATABASE_URL`, plus `R2_*` for the mirror                                                  |

- `BETTER_AUTH_SECRET` must be 64 hex characters, because it is also the AES-256-GCM key for OAuth tokens at rest (`encryptToken()` in `auth.server.ts`). Changing it makes stored OAuth tokens unreadable.
- `DATABASE_URL` goes through pgbouncer; `DATABASE_URL_UNPOOLED` is the direct connection drizzle-kit and the migrator need.
- `COSMO_KEY` is only the fallback: the live COSMO encryption key is the `cosmo-key` Redis key (see below).
- `VITE_CHAT_URL` unset turns chat off in the web app.
- `VITE_UMAMI_SCRIPT_INTEGRITY` is the SRI hash of the script at `VITE_UMAMI_SCRIPT_URL`. Each umami release ships a different script, so recompute the hash and rebuild web whenever umami is upgraded. If the hash is stale, browsers refuse to run the script and analytics stop with no visible error. Get the new value with `curl -s <script url> | openssl dgst -sha384 -binary | openssl base64 -A` and prefix it with `sha384-`.

`.env.example` names some variables for Compose, which renames them for the container:

| In `.env`                                                         | In the container                                  |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `INDEXER_RPC_ENDPOINT`, `INDEXER_ENABLE_OBJEKTS`, … (`INDEXER_*`) | the same name without `INDEXER_`, for `processor` |
| `TYPESENSE_IMPORT_LOOP_INTERVAL`                                  | `LOOP_INTERVAL`, for `import-server`              |

## Lint

- `lint` runs `oxlint --type-aware --type-check`, so type errors also fail lint.
- Every workspace's `oxlint.config.ts` `extends` the base in `packages/lint/oxlint.config.ts`.
- `extends` **replaces** the `plugins` array, so a workspace that sets `plugins` repeats the full set. `apps/web` lists `["typescript", "react", "import", "unicorn", "jest"]`; trimming it to `["react"]` silently drops the rest.
- `jsPlugins` and `rules` merge with the base, so the `anti-slop` rules still apply in workspaces that add their own JS plugins.
- Effect workspaces add `@effect/eslint-plugin` with `@effect/dprint` off. `apps/web` adds the drizzle and TanStack plugins.
- `no-console` allows only `console.warn` and `console.error`. `apps/web` turns it off for `main.ts`, `instrument.ts` and `scripts/**`.
- Suppress one line with `// oxlint-disable-next-line <rule> -- <reason>`, always naming the rule and the reason. A CLI script that logs may disable `no-console` for the whole file the same way.
- The `anti-slop` rules, what each wants instead, the `SAFETY:` comment rule and how to exempt a directory are in [`packages/lint/README.md`](../packages/lint/README.md).

## Format

- `bun fmt` formats TypeScript, CSS, JSON, YAML and Markdown, configured by `[fmt]` in the root `bunfig.toml`:
  - print width 80, trailing commas
  - imports sorted in three groups: builtin and external, then `@/**` and `@apollo/**`, then relative
  - Tailwind classes sorted in `apps/web/**`, including inside `cn()` calls
  - `ignorePatterns` skips `routeTree.gen.ts`, `apps/web/drizzle/` and the serial-estimation fixtures
- Markdown tables get realigned, so keep ASCII diagrams inside code fences.
- `.githooks/pre-commit` runs `bun fmt --staged`, which formats and restages staged files. `bun install` points `core.hooksPath` at `.githooks` through the root `prepare` script.
- The hook blocks a commit when a staged file has a syntax error, or needs formatting but also has unstaged changes. Stage the rest, or `git stash --keep-index`.
- The `PostToolUse` hook in `.claude/settings.json` formats and lint-fixes every `.ts` or `.tsx` file an agent edits.
- Zed formats on save through `bun fmt --stdin-filepath`. VS Code has no format-on-save, only the `source.fixAll.oxc` action.

## TypeScript

- Every workspace's `typecheck` is `bun check`, which reports exactly what `tsc` reports for the TypeScript 7 built into the installed Bun (`bun -p process.versions.typescript`).
- TypeScript 7 has no compiler API: don't add tooling that imports `typescript` and calls `createProgram()` or `emit()`.
- `tsc` itself runs in two places: the editor (`js/ts.tsdk.path`) and `apps/indexer`'s `build` (`tsc -p tsconfig.build.json`), which TypeORM needs for its decorator metadata.
- Every workspace extends `@apollo/typescript/tsconfig.bun.json`, which turns on `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` and the unused-locals checks.

Keep these versions in step when bumping Bun, TypeScript or turbo:

| Tool       | Must match in                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Bun        | `packageManager` in `package.json`, `@types/bun` in the catalog, the `oven/bun` tags in `apps/*/Dockerfile` |
| TypeScript | `typescript` in the catalog = `bun -p process.versions.typescript`                                          |
| turbo      | `turbo` in the catalog, the `turbo prune` versions in `apps/*/Dockerfile`                                   |

## Effect conventions

`apps/schedules`, `apps/chat` and `apps/typesense-import` are Effect programs. The web app uses Effect only through the `ManagedRuntime` in `apps/web/src/lib/server/runtime.server.ts`, for the rate limiter and the job queue.

- A service is a `Context.Service` class with a `make` effect and a `static readonly layer = Layer.effect(this, this.make)`, taking its dependencies through `Layer.provide`. An app composes its layers with `Layer.mergeAll`.
- Read config inside `make` with `Config.*` (`Config.Redacted` for secrets), so a missing variable fails at boot.
- Give each failure mode its own `Data.TaggedError`. Wrap promise APIs in `Effect.tryPromise` with a typed `catch`.
- Drizzle queries through `@apollo/drizzle-bun-effect` are effects: yield them and let drizzle's typed errors flow.
- `DatabaseWeb.layer()` (`@apollo/services/database-web`) builds a new client on every call, and layers memoize by reference, so an app declares its web DB layer once and reuses that value.
- Provide Redis through the shared `redisLayer` value (`@apollo/services/redis`), not a new `BunRedis` layer, so an app keeps one client.
- The schedules web client has one connection, so nothing inside its transactions may query through the pool; see [`apps/schedules/CLAUDE.md`](../apps/schedules/CLAUDE.md).
- The repo runs Effect v4; finding its docs is in [`docs/libraries.md`](libraries.md).

## Redis

Keys and channels that more than one app touches, or that have a rule attached:

| Key or channel          | Kind                       | Written by                                         | Read by                       | Rule                                                                           |
| ----------------------- | -------------------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `trade-events`          | pub/sub                    | web and schedules, after their transaction commits | chat                          | `TRADE_EVENTS_CHANNEL`, `tradeUpdateMessage()` in `@apollo/trades`             |
| `user-events`           | pub/sub                    | web (`publishUserEvent()`)                         | chat                          | the `UserEvent` union in `@apollo/auth/events`                                 |
| `trade-notifications`   | job queue                  | web offers                                         | schedules takes               | `@apollo/queue`; only schedules runs the cleanup layer                         |
| `pins:v3:<md5>`         | cache, 1 day               | web `$fetchPins`                                   | web; schedules' drain deletes | always build it with `pinCacheKey()` (`@apollo/util-server`)                   |
| `cosmo-key`             | value, no TTL              | staff, from the admin page                         | web, schedules                | falls back to `COSMO_KEY`; never cache it in a module, because staff rotate it |
| `objekt-stats`          | cache, 2 hours             | web                                                | web                           | schedules' `clear-objekt-stats` deletes it hourly                              |
| `cosmo:verify:<userId>` | value, 5 min               | web                                                | web                           | the pending COSMO link verification code                                       |
| `notice`                | value, no TTL              | staff                                              | web                           | the navbar notice                                                              |
| rate-limit buckets      | Effect `RateLimiter` store | web, chat                                          | web, chat                     | see [Rate limits](#rate-limits)                                                |

- Every other key is a web-only read-through cache made by `remember()` in `apps/web/src/lib/server/cache.server.ts`; `rg "remember\("` lists them.
- `remember()` lowercases its key and `clearTag()` doesn't, so a key you clear must already be lowercase.
- When a cached value's type changes, bump the version in its key (`pins:v3`, `grid-catalog:v3`) or pass `remember()` a schema, so old entries are treated as misses.

## Rate limits

Web limits are fixed windows consumed through `consumeRateLimit()` in `apps/web/src/lib/server/rate-limit.server.ts`, which throws `ExpectedError("rate_limited")` once a window is spent. Chat's limits are in [`apps/chat/CLAUDE.md`](../apps/chat/CLAUDE.md#rate-limits).

| Key                       | Limit       | Consumed by                                                      |
| ------------------------- | ----------- | ---------------------------------------------------------------- |
| `listing-post:<user>`     | 10 / 10 min | `$postListing`                                                   |
| `listing-edit:<user>`     | 20 / 10 min | `$editListing`                                                   |
| `listing-claim:<user>`    | 10 / 10 min | `$claimListing`                                                  |
| `trade-cancel:<user>`     | 10 / 10 min | `$cancelTrade`                                                   |
| `trade-dispute:<user>`    | 5 / 10 min  | `$openDispute`                                                   |
| `feedback:<user>`         | 10 / 10 min | `$leaveFeedback`                                                 |
| `feedback-remove:<staff>` | 30 / 10 min | `$removeFeedback` (staff)                                        |
| `report:<user>`           | 5 / 10 min  | `$createReport`, and chat's `Report`: one shared budget          |
| `account-deletion:<user>` | 3 / 1 hour  | `$requestAccountDeletion`                                        |
| `user-search:<ip>`        | 15 / 1 min  | `$searchUsers`                                                   |
| `qr-recaptcha:<user>`     | 5 / 1 min   | `$fetchQrTicket`, because each call drives a browserless session |
| `qr-ticket:<user>`        | 60 / 1 min  | `$queryQrTicket`                                                 |

## Sentry

| Runtime                                                | Initialised in                                 | Configured by                                                   |
| ------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------- |
| web server                                             | `apps/web/instrument.ts`, preloaded by `start` | `VITE_SENTRY_DSN`                                               |
| web browser                                            | `apps/web/src/lib/client/sentry.ts`            | `VITE_SENTRY_DSN`                                               |
| web build                                              | `sentryVitePlugin` in `vite.config.mts`        | uploads hidden source maps only when `SENTRY_AUTH_TOKEN` is set |
| `apps/indexer`                                         | `apps/indexer/src/instrument.ts`               | `SENTRY_DSN` (`INDEXER_SENTRY_DSN` through Compose)             |
| `apps/chat`, `apps/schedules`, `apps/typesense-import` | none                                           | failures go to the logs                                         |

- An empty or missing DSN reports nothing, so local runs stay silent.
- `getRouter()` imports the browser init lazily, so the SDK downloads beside hydration instead of in the entry chunk; errors thrown before it loads go unreported.
- Both web inits send no user info, cookies, bodies or IP headers, and tracing is off.
- What each web runtime drops is in [`docs/errors.md`](errors.md); the indexer's fingerprint and flush rules are in [`apps/indexer/CLAUDE.md`](../apps/indexer/CLAUDE.md).
