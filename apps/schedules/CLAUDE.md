# Schedules App

Effect-TS service that runs Apollo's cron-scheduled background tasks (syncing gravities, members, FX rates, price stats; draining outboxes; clearing stats). Runs on Bun via `BunRuntime`.

## Task model

Each task is a `ScheduledTask` (`src/task.ts`): `{ name, cron, timezone?, effect }`. One file per task in `src/functions/`, registered in the `SCHEDULED_TASKS` array. `createResilientTask` forks each task as its own fiber: executions retry with exponential backoff (3 retries), any remaining failure is caught inside the repeat and logged with its cause, and the task then waits for the next cron tick — a failing iteration never kills the fiber or its siblings.

**Adding a task:** create `src/functions/<name>.ts` exporting a `ScheduledTask`, register it in `SCHEDULED_TASKS`, and give it a `/** */` docblock stating what it does and why the cadence was chosen (see `sync-members.ts`).

## Services

Defined as `Context.Service` classes in `src/` — a `make:` effect plus a hand-written `static readonly layer` (`Layer.effect(this, this.make)`, with `Layer.provide([...])` wiring dependencies) — and provided via `Layer.mergeAll` in `src/main.ts`:

- `DatabaseWeb` / `DatabaseIndexer` — drizzle's Effect API over the two Postgres databases via `@apollo/drizzle-bun-effect` (Bun SQL-backed, same driver stack as the web app). Each `make` acquires a scoped Bun `SQL` client (application_name via URL, `end({ timeout: 5 })` finalizer); queries and `db.transaction` are Effects, failing with `EffectDrizzleQueryError` / `SqlError`
- `ProxiedToken` — COSMO access token for the dummy account, read from the web DB `cosmoTokens` table and auto-refreshed (via `refreshV3` + `CosmoKey`) when the JWT is expired
- `CosmoKey`, `Redis`, `Env` — encryption key, cache, config

## Conventions

- Config comes from env vars via the default `ConfigProvider` (`fromEnv()`); env files are loaded by the `dev` script, not the code.
- Errors are per-failure-mode `Data.TaggedError` classes; wrap promise-based calls in `Effect.tryPromise` with a typed `catch`. Drizzle calls are already effectful — yield them directly and let drizzle's typed errors flow, adding a domain wrapper via `Effect.mapError` only where it carries extra context (e.g. `StoreGravitiesError{artist}`).
- Cross-package logic lives in `@apollo/cosmo` (API calls), `@apollo/database` (schemas), `@apollo/util` / `@apollo/util-server` (helpers) — don't duplicate it here.
- Use context7 for Effect API documentation (see `docs/libraries.md`).
