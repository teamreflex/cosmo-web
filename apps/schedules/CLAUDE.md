# Schedules App

Effect-TS service that runs Apollo's cron-scheduled background tasks (syncing gravities, members, FX rates, price stats and their daily history, market stats; draining outboxes; clearing stats; recomputing estimated objekt serials) and the workers for the web app's job queues (notification fan-outs). Runs on Bun via `BunRuntime`.

## Task model

Each task is a `ScheduledTask` (`src/task.ts`): `{ name, cron, timezone?, effect }`. One file per task in `src/functions/`, registered in the `SCHEDULED_TASKS` array. `createResilientTask` forks each task as its own fiber: executions retry with exponential backoff (3 retries), any remaining failure is caught inside the repeat and logged with its cause, and the task then waits for the next cron tick — a failing iteration never kills the fiber or its siblings.

**Adding a task:** create `src/functions/<name>.ts` exporting a `ScheduledTask`, register it in `SCHEDULED_TASKS`, and give it a `/** */` docblock stating what it does and why the cadence was chosen (see `sync-members.ts`).

**Running one task:** `bun run task <name>` (`src/run-task.ts`) runs a registered task's effect once and exits, with the same services `main.ts` provides (`servicesLayer` in `src/services.ts`) but no queue workers and no retries, so a failure exits non-zero. Stop `bun run dev` first when the task is `drain-outbox`, since dev runs it at boot and every minute.

## Outbox drain

`drain-outbox` applies the indexer's `list_event_outbox` (see `apps/indexer/CLAUDE.md`) to the web DB, tracking progress in `list_drain_cursor`. Each batch runs in one web DB transaction: it locks the cursor row (`SELECT … FOR UPDATE`), reads up to 1,000 outbox rows past it in id order, applies them, and advances `seq` before committing. An overlapping run waits on the lock, then reads past the advanced cursor, so a batch applies once.

The per-row logic is pure (`src/outbox.ts`, tested in `tests/outbox.test.ts`): `parseOutboxRow` narrows each row by its `type`, `decideRow` says what it does, and `planBatch` walks the batch in id order. A `transfer` row clears its token: the token's list entries, pins and binder slot are deleted, and binder covers showing it are cleared. A `transferability` row changes nothing in the web DB. Every drained row, whether or not it changed anything, moves `list_drain_cursor.chain_time` to the newest chain timestamp seen (it never moves back), so the watermark keeps moving through quiet periods.

The drain logs a warning when its cursor is past the outbox's max id, which happens after the indexer DB is restored or replaced, and purges outbox rows that are both drained and older than 7 days.

**Deploying outbox changes:** indexer migration → processor → schedules. The indexer migration runs when the processor starts, and the drain reads the outbox columns it adds and writes `list_drain_cursor.chain_time`, so schedules deploys last, after the web migrations too.

## Simulating the chain locally

Locally the processor stays off and chain activity is simulated against the indexer DB with `bun run simulate` (`scripts/simulate.ts`):

- `simulate init` sets the drain cursor to the outbox's max id. Run it after restoring either database, or the drain skips every simulated row.
- `simulate transfer --token <id> --to <address> [--at <iso>]` moves the objekt, inserts a `transfer` row and appends a `transfer` outbox row, in one transaction. `--at` sets the chain timestamp (default now).
- `simulate transferability --token <id> --transferable <true|false>` flips the objekt and appends a `transferability` outbox row.
- `simulate reset` reverts every simulated row and restores each objekt from the journal those commands keep in the indexer's `simulate` schema, then drops the schema. The web-side effects of drained rows stay, and the outbox sequence stays advanced, so a later row never reuses an id the drain has passed.

## Queue workers

Jobs the web app hands off, such as notification fan-outs that would otherwise slow the request, go through `@apollo/queue`: one `Context.Service` per queue that owns its name, job schema and Redis store settings, so the web app and this app can't disagree on them. The web app `offer`s after its write commits; this app `take`s.

Each worker is a layer made by `createQueueWorker(name, take)` (`src/queue.ts`), following Effect's own `DurableQueue.worker`: it forks one take loop for the layer's lifetime, so workers start when `main.ts` builds its layers and stop at shutdown. One file per queue in `src/queues/`, whose worker provides its own queue service; `main.ts` merges the workers with `cleanupLayer` (trims completed job ids after 30 days, runs only here) into `queueWorkers`. One loop per queue, since the web DB client has a single connection and more loops would only queue behind each other. A failed job goes back to the queue, which retries it with exponential backoff and moves it to the failed list after 10 attempts; the worker logs the failure and takes the next job. A handler first checks that its job still applies and returns early otherwise: the trade handler skips a source list that no longer belongs to its user or is no longer trade-active, since a list or account deleted before the job ran would fail every insert on a foreign key and end up in the failed list. Delivery is at least once, so handlers must be idempotent: the notification handlers insert through `insertNotifications` (`src/notifications.ts`), whose dedup index makes a replay a no-op.

**Adding a queue:** add its service to `@apollo/queue` and provide its layer in the web runtime (`lib/server/runtime.server.ts`), then create `src/queues/<name>.ts` exporting a `createQueueWorker` layer with a `/** */` docblock and merge it into `queueWorkers` in `main.ts`. A job schema change that old jobs can't decode needs a new queue name (`<name>-v2`); drain the old queue before removing it.

## Services

Defined as `Context.Service` classes in `src/` — a `make:` effect plus a hand-written `static readonly layer` (`Layer.effect(this, this.make)`, with `Layer.provide([...])` wiring dependencies) — and merged into `servicesLayer` (`src/services.ts`), which `main.ts` and `run-task.ts` provide:

- `DatabaseWeb` / `DatabaseIndexer` — drizzle's Effect API over the two Postgres databases via `@apollo/drizzle-bun-effect` (Bun SQL-backed, same driver stack as the web app). Each `make` acquires a scoped Bun `SQL` client (application_name via URL, `end({ timeout: 5 })` finalizer); queries and `db.transaction` are Effects, failing with `EffectDrizzleQueryError` / `SqlError`
- `ProxiedToken` — COSMO access token for the dummy account, read from the web DB `cosmoTokens` table and auto-refreshed (via `refreshV3` + `CosmoKey`) when the JWT is expired
- `CosmoKey`, `Redis`, `Exchangerate` — encryption key, cache, FX rates API

## Conventions

- Config is read where it is consumed (`Config.Redacted("...")` inside a service's `make`, `BunRedis.layerConfig` for Redis) via the default `ConfigProvider` (`fromEnv()`), so a missing variable fails at boot; env files are loaded by the `dev` script, not the code.
- Errors are per-failure-mode `Data.TaggedError` classes; wrap promise-based calls in `Effect.tryPromise` with a typed `catch`. Drizzle calls are already effectful — yield them directly and let drizzle's typed errors flow, adding a domain wrapper via `Effect.mapError` only where it carries extra context (e.g. `StoreGravitiesError{artist}`).
- Cross-package logic lives in `@apollo/cosmo` (API calls), `@apollo/database` (schemas), `@apollo/queue` (job queues), `@apollo/util` / `@apollo/util-server` (helpers) — don't duplicate it here.
- Use context7 for Effect API documentation (see `docs/libraries.md`).
