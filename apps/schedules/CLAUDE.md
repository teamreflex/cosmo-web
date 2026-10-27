# Schedules App

Effect-TS service that runs Apollo's cron-scheduled tasks (`README.md` lists each one with its schedule) and the workers for the web app's job queues. Runs on Bun via `BunRuntime`.

## Task model

Each task is a `ScheduledTask` (`src/task.ts`): `{ name, cron, timezone?, effect }`, one file per task in `src/functions/`, registered in the `SCHEDULED_TASKS` array.

`createResilientTask` forks each task as its own fiber:

- executions retry with exponential backoff (3 retries);
- any remaining failure is caught inside the repeat and logged with its cause;
- the task then waits for the next cron tick, so a failing iteration never kills the fiber or its siblings.

**Adding a task:** create `src/functions/<name>.ts` exporting a `ScheduledTask`, register it in `SCHEDULED_TASKS`, and give it a `/** */` docblock stating what it does and why the cadence was chosen (see `sync-members.ts`).

**Running one task:** `bun run task <name>` (`src/run-task.ts`) runs a registered task's effect once and exits. It has the same services `main.ts` provides (`servicesLayer` in `src/services.ts`) but no queue workers and no retries, so a failure exits non-zero. Stop `bun run dev` first when the task is `drain-outbox` or `trade-timers`, since dev runs both at boot and every minute.

## Tasks

### drain-outbox

`drain-outbox` applies the indexer's `list_event_outbox` (see `apps/indexer/CLAUDE.md`) to the web DB, tracking progress in `list_drain_cursor`. Each batch runs in one transaction that locks the cursor row (`FOR UPDATE`), reads up to 1,000 rows past it and advances `seq`, so an overlapping run waits and then reads past it: a batch applies once.

The per-row logic is pure (`src/outbox.ts`, tested in `tests/outbox.test.ts`). A `transfer` row clears the token's list entries, pins and binder slot. Every drained row moves `list_drain_cursor.chain_time` forward to its chain timestamp, so the watermark keeps moving through quiet periods.

#### Trades

The same transaction then applies the batch to the trade tables (`applyTrades`; `docs/trades.md` maps the whole trade system). `@apollo/trades`' `foldTransfers` decides each row in order, so a token that arrives and is passed on in one batch is recorded once. Only the exact pinned tokens count.

- **Arrivals:** a transfer to an item's receiver at the trade's pinned address marks the item sent, from whichever wallet, and a trade with nothing left owed completes. A disputed trade still records transfers, but only staff complete it.
- **Pending offers:** a token that moves elsewhere or turns untransferable is posted on its live trade and turns pending offers holding it `stale`. Each gets a `stale` event naming the token and whether it moved or turned untransferable, and an `offer_stale` notification to its proposer (`proposed_by`).
- **Listing pools:** a token leaving its poster for anywhere (its own trade's claimer included), or turning untransferable, is dropped from the pool of every open listing offering it, which moves the listing's `updated_at`.
- **Closing listings:** a listing whose pool can then no longer make a unit, with none of its trades live, closes by `listingClosing()`, and a broken one sends `listing_closed` to its poster naming the token that left. A completed trade takes its tokens out of its listing's pool and closes the listing by the same rule. Each listing the batch touched is judged once, after every trade the batch completes has ended.
- **Rolled-back transfers:** a row whose indexer `transfer` was rolled back (the processor runs with hot blocks) still clears the token but is skipped for trades.
- **Publishing:** touched trades are published on `trade-events` after the commit.

Locks follow the lock order in `docs/auth.md`: the drain locks both parties of every pending offer and live trade it touches, then the pending offers before the listings. Recipients who are gone or actively banned are skipped (`banActive` is an SQL mirror of `isBanActive`, since this app doesn't depend on `@apollo/auth`).

Notifications go in with `tx.insert` inside the transaction (`insertTradeNotifications`), never through `insertNotifications` or the pool: the web client has one connection, which the transaction holds, so either would wait forever.

Known gaps, left to staff through a dispute:

- a recorded transfer that a reorg then rolls back stays recorded;
- a transfer still in flight on chain can be followed by a successful party cancel, after which the drain ignores it;
- a rolled-back `transferability` row has no `transfer_id`, so it still breaks listings.

The drain warns when its cursor is past the outbox's max id, which happens after the indexer DB is restored or replaced, and purges drained rows older than 7 days.

**Deploying outbox changes:** indexer migration → processor → schedules. The processor runs the indexer migration when it starts, and the drain reads the columns it adds, so schedules deploys last, after the web migrations too.

#### Simulating the chain locally

Locally the processor stays off and chain activity is simulated against the indexer DB with `bun run simulate` (`scripts/simulate.ts`):

- `simulate init` sets the drain cursor to the outbox's max id. Run it after restoring either database, or the drain skips every simulated row.
- `simulate transfer --token <id> --to <address> [--at <iso>]` moves the objekt and appends a `transfer` row and its outbox row. `--at` sets the chain timestamp (default now).
- `simulate transferability --token <id> --transferable <true|false>` flips the objekt and appends a `transferability` outbox row.
- Only a drained row moves the watermark: to seed it, simulate a transfer of an objekt in no listing or trade (to `0x000000000000000000000000000000000000dEaD`) and run `bun run task drain-outbox`.
- To simulate a hot-block rollback, delete the `transfer` row an outbox row names before draining.
- `simulate reset` reverts every simulated row from the journal in the indexer's `simulate` schema. Web-side effects of drained rows stay, and the outbox sequence stays advanced, so a later row never reuses an id the drain has passed.

### trade-timers

`trade-timers` runs every minute in three passes, in this order: offer expiry, offers on closed listings, then trade deadlines, each in its own transaction. The two offer passes scan for due offers before opening theirs, so a pass with nothing due opens none. Each pass handles up to 100 rows a run, so a backlog clears at 100 a minute, and writes its due-row query with a literal `kind`/`status` predicate so a partial index serves it.

#### Offer expiry

Pending offers expire on the clock rather than the watermark, since nothing on chain decides when an offer ends. A null or lagging watermark never holds expiry back.

- It takes offers whose `expires_at` is at or before `now()`, oldest first, through the partial `trade_offers_expiry_idx`.
- It locks the parties `FOR KEY SHARE`, then the offers in id order. Its update re-checks `status = 'pending'` and `expires_at <= now()`, so an offer accepted, answered or withdrawn meanwhile is left alone.
- Each expired offer gets an `expired` event and an `offer_expired` notification to its proposer (`proposed_by`) only.

#### Offers on closed listings

It declines pending offers on listings that are no longer open. These are left behind in two ways:

- a fill or a break closes a listing without locking its offers first;
- a withdrawal misses an offer sent after it read the listing's offers.

A ban or an account deletion declines the offers its poster received itself, in the web app's `closeOpenOffers()`.

- It finds them in id order as pending trades (through `trade_offers_expiry_idx`) with an item whose `listing_id` names a listing that isn't open. Pending trades are few, so this needs no index of its own.
- It locks both parties `FOR KEY SHARE`, then the offers in id order. Its update re-checks that each is still pending and its listing still not open; a listing never reopens, so its status needs no lock.
- Each declined offer gets a `declined` event by `listing` and an `offer_declined` notification to its proposer, the claimer.

An offer can't be accepted before the sweep reaches it, since accepting re-checks under its lock that the listing is open.

#### Trade deadlines

It ends accepted trades whose `deadline_at` is at or before the drain's watermark (`list_drain_cursor.chain_time`), never `now()`. A transfer stamped before the deadline but drained after it still counts, because the watermark only reaches the deadline once that transfer is drained.

`transition(time_out)` decides each trade:

- one nobody owes anything on completes;
- one where something was sent and something is still owed is disputed: `disputeAtDeadline` files a `deadline_passed` report naming the side that sent everything it owed (`waitingSide`), or no one when both sent part, and notifies both parties with `trade_disputed`;
- one where nothing was sent times out, which leaves its tokens free in its listing's pool.

Once the due trades have ended, each listing they came from closes by `listingClosing()` (`closeSpentListings`), and one that breaks, because the drain dropped pool tokens while its trade was live, sends `listing_closed` to its poster naming no token. The poster is the trade's `from` party, already locked.

Neither the drain nor the timers read holdings from the indexer. It locks the cursor `FOR SHARE`, so it waits for a drain batch in flight, and its due-trade query is served by the partial `trade_offers_deadline_idx`. It logs an error when the watermark is null or trails the clock by more than 10 minutes, since then nothing times out on time.

#### Running it locally

Make a trade due by moving its deadline behind the watermark, or an offer due by moving its expiry into the past, then run `bun run task trade-timers`:

- `UPDATE trade_offers SET deadline_at = (SELECT chain_time FROM list_drain_cursor WHERE name = 'outbox-drain') - interval '1 second' WHERE id = '<trade>'`
- `UPDATE trade_offers SET expires_at = now() - interval '1 second' WHERE id = '<offer>'`

### chat-retention

`chat-retention` runs hourly and blanks the body of every chat message whose trade ended more than `CHAT_RETENTION_DAYS` ago, leaving the row and its sender. Event rows and reported messages' copies in `report_messages` are untouched. Bodies are ciphertext that only apps/chat can read; this task never reads them.

### sync-market-stats

Copies each listed collection's USD floor, listing count and latest listing time from the web DB's sale lists into the indexer's `collection_market_stats` (see `apps/indexer/CLAUDE.md`), and deletes the rows of collections no longer listed. It runs every minute, so `/market` trails a sale list edit by up to a minute.

### sync-collection-price-stats

Recomputes each collection's USD median price from every priced list entry into `collection_price_stats`, then copies the rows into `collection_price_history` under today's UTC date, so the day's last run is its snapshot.

### sync-fx-rates

Upserts USD-base rates from exchangerate-api.com into `fx_rates`, keyed by `(date, currency)` so history is kept. A currency is supported while it has a row on the newest date.

### sync-gravities

Syncs every artist's gravities and poll candidates from the COSMO API through `ProxiedToken`. One artist failing is logged and doesn't stop the others.

### sync-members

Syncs the member list (sort order, alias, units, colour) from the COSMO API into the indexer's `member` table, which backs member-sorted objekt queries.

### clear-objekt-stats

Deletes the web app's cached `objekt-stats` (the `/objekts/stats` page) every hour, so the next request recomputes it.

## Queue workers

Jobs the web app hands off, such as notification fan-outs, go through `@apollo/queue`: one `Context.Service` per queue that owns its name, job schema and Redis store settings, so the web app and this app can't disagree on them. The web app `offer`s after its write commits; this app `take`s.

Each worker is a layer made by `createQueueWorker(name, take)` (`src/queue.ts`) that forks one take loop for the layer's lifetime; one loop per queue, since the web DB client has a single connection.

- A failed job is retried with exponential backoff and moved to the failed list after 10 attempts.
- Delivery is at least once, so handlers must be idempotent (`insertNotifications`' dedup index makes a replay a no-op).
- A handler first checks that its job still applies, since a list or account deleted before it runs would fail every insert on a foreign key.

**Adding a queue:** add its service to `@apollo/queue` and provide its layer in the web runtime (`lib/server/runtime.server.ts`). Then create `src/queues/<name>.ts` exporting a `createQueueWorker` layer with a `/** */` docblock, and merge it into `queueWorkers` in `main.ts`. A job schema change that old jobs can't decode needs a new queue name (`<name>-v2`); drain the old queue before removing it.

## Services

Defined as `Context.Service` classes in `src/` (or `@apollo/services`): a `make:` effect plus a hand-written `static readonly layer` (`Layer.effect(this, this.make)`, with `Layer.provide([...])` wiring dependencies). They're merged into `servicesLayer` (`src/services.ts`), which `main.ts` and `run-task.ts` provide.

- `DatabaseWeb` / `DatabaseIndexer`: drizzle's Effect API over the two Postgres databases via `@apollo/drizzle-bun-effect` (Bun SQL-backed, same driver stack as the web app).
  - Each `make` acquires a scoped Bun `SQL` client (application_name via URL, `end({ timeout: 5 })` finalizer). Queries and `db.transaction` are Effects, failing with `EffectDrizzleQueryError` / `SqlError`.
  - `DatabaseWeb` (with `WebTx`) and `redisLayer` come from `@apollo/services`, shared with `apps/chat`.
  - `DatabaseWeb.layer({ applicationName, max })` builds a new layer on every call, and layers memoize by reference, so `services.ts` declares `webDatabaseLayer` (one connection) once and everything here reuses it.
- `ProxiedToken`: the COSMO access token for the dummy account, read from the web DB `cosmoTokens` table and auto-refreshed (via `refreshV3` + `CosmoKey`) when the JWT is expired.
- `CosmoKey`, `Redis`, `Exchangerate`: encryption key, cache, FX rates API.

## Conventions

- Config is read where it is consumed (`Config.Redacted("...")` inside a service's `make`, `BunRedis.layerConfig` for Redis) via the default `ConfigProvider` (`fromEnv()`), so a missing variable fails at boot. Env files are loaded by the `dev` script, not the code.
- Errors are per-failure-mode `Data.TaggedError` classes; wrap promise-based calls in `Effect.tryPromise` with a typed `catch`. Drizzle calls are already effectful: yield them directly and let drizzle's typed errors flow, adding a domain wrapper via `Effect.mapError` only where it carries extra context (e.g. `StoreGravitiesError{artist}`).
- Cross-package logic lives in `@apollo/cosmo` (API calls), `@apollo/database` (schemas), `@apollo/queue` (job queues), `@apollo/trades` (trade lifecycle, the drain's transfer decisions, deadlines) and `@apollo/util` / `@apollo/util-server` (helpers); don't duplicate it here.
- Use context7 for Effect API documentation (see `docs/libraries.md`).
