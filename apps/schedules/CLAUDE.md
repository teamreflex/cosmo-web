# apps/schedules

One long-running Bun process, built with Effect, that runs Apollo's cron tasks and the workers for the web app's job queues. `README.md` has the task schedules, the queue list, the env vars and the drain pipeline diagram; general Effect conventions are in [`docs/tooling.md`](../../docs/tooling.md).

## Process shape

- `src/main.ts` provides `servicesLayer` and `queueWorkers`, forks one fiber per `SCHEDULED_TASKS` entry, then waits on `Effect.never`, because returning would interrupt the task fibers.
- Every service layer builds at boot, so a missing env var stops the whole process, the drain included. `bun run task` fails the same way.
- Env files are loaded by the package scripts' `--env-file` flags, never by code.

## Services

All of them are merged into `servicesLayer` (`src/services.ts`), which `main.ts` and `src/run-task.ts` both provide.

| Service                | From                            | What to know                                                                                           |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DatabaseWeb`, `WebTx` | `@apollo/services/database-web` | built once as `webDatabaseLayer`, with one connection                                                  |
| `DatabaseIndexer`      | `src/db-indexer.ts`             | one connection                                                                                         |
| `Redis.Redis`          | `@apollo/services/redis`        | queues, caches and `trade-events`                                                                      |
| `ProxiedToken`         | `src/proxied-token.ts`          | the newest `cosmo_tokens` row; an expired access JWT is refreshed through `refreshV3()` into a new row |
| `CosmoKey`             | `src/cosmo-key.ts`              | the Redis `cosmo-key` value set from the admin cache page, else `COSMO_KEY`                            |
| `Exchangerate`         | `src/exchangerate.ts`           | its errors drop the HTTP client error, because the request URL embeds the API key                      |

A task that needs a new service adds it to the closed requirement union of `ScheduledTask` in `src/task.ts` and to `servicesLayer`.

## One connection per database

- The web client has `max: 1`. Every task fiber and the queue worker share it, so the process runs one web statement at a time.
- `db.transaction` reserves that connection. Any `db` call inside the transaction waits forever for it, so inside a transaction use only `tx`.
- That is why `insertTradeNotifications(tx, …)` exists beside `insertNotifications()`, which goes through the pool.
- Reuse `webDatabaseLayer` everywhere. A second `DatabaseWeb.layer()` call opens a second client ([`docs/tooling.md`](../../docs/tooling.md) explains why).
- The indexer client also has one connection, so a long indexer job such as `recompute-serials` delays every other indexer read in the process.

## Task model

- A task is a `ScheduledTask` in `src/functions/<name>.ts`, registered in `SCHEDULED_TASKS` (`src/task.ts`).
- `createResilientTask()` parses the cron in `timezone` (default UTC) and retries a failed run 3 times with exponential backoff from 1 s. A run still failing is logged with its cause, and the task waits for the next tick, so the fiber never dies.
- A task runs once at boot, then on its cron. `runAtBoot: false` waits for the first tick; heavy tasks set it, because every restart runs every other task at once.
- Runs of one task never overlap inside one process. Two processes can overlap (dev plus `bun run task`, or dev plus the compose `schedules` service); the drain and the timers stay correct because of their locks.
- `bun run task <name>` runs one task once with the same services, no queue workers and no retries, and exits non-zero on failure.
- Adding a task: export it with `satisfies ScheduledTask`, register it, and give it a `/** */` docblock saying what it does and why it has that cadence.

## Tasks

| Task                          | Data flow                               | What to know                                                                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drain-outbox`                | indexer → web, Redis                    | see [drain-outbox](#drain-outbox)                                                                                                                                                                                                                          |
| `trade-timers`                | web, Redis                              | see [trade-timers](#trade-timers)                                                                                                                                                                                                                          |
| `sync-market-stats`           | web → indexer `collection_market_stats` | skips the run while `fx_rates` is empty, because an empty rate table would empty `/market`; unchanged rows are not rewritten                                                                                                                               |
| `apply-serial-confirmations`  | indexer                                 | re-estimates every collection holding a `serial_confirmation` its objekt doesn't match yet                                                                                                                                                                 |
| `sync-gravities`              | COSMO → web                             | only inserts gravities not stored yet and never updates stored ones; a failed poll fetch skips the rest of that artist, a failed insert skips that gravity                                                                                                 |
| `clear-objekt-stats`          | Redis                                   | `DEL objekt-stats`; the web app's `remember("objekt-stats", …)` in `apps/web/src/lib/functions/stats.ts` spells the same bare literal, so rename both or neither                                                                                           |
| `chat-retention`              | web                                     | nulls the `body` of `text` messages `CHAT_RETENTION_DAYS` after their trade ended, decrypting nothing; what survives is in [`apps/chat/README.md`](../chat/README.md)                                                                                      |
| `sync-collection-price-stats` | web                                     | one transaction; skips while `fx_rates` is empty, because it would evict every collection; the day's last run is that UTC date's `collection_price_history` snapshot                                                                                       |
| `sync-fx-rates`               | API → web `fx_rates`                    | stores the inverse of the API's USD-base rate (`rate_to_usd` is USD per unit), upserted on `(date, currency)`                                                                                                                                              |
| `sync-members`                | COSMO → indexer `member`                | upserted on `name`; fails with `NoMembersError` when COSMO returns none                                                                                                                                                                                    |
| `recompute-serials`           | indexer                                 | `runAtBoot: false`; collections with an objekt minted in the last 25 h; writes 1000 serials per statement with 250 ms pauses, so a large rewrite doesn't outrun WAL shipping and vacuum; idempotent ([`docs/cosmo.md`](../../docs/cosmo.md) has the model) |

## drain-outbox

`README.md` draws the pipeline and its transaction boundary. What the drain decides for each trade, listing and offer is in [`docs/trades/drain.md`](../../docs/trades/drain.md).

### Exactly-once

- `lockCursor()` locks `list_drain_cursor` row `outbox-drain` `FOR UPDATE` first, and the batch is read past its `seq`.
- The list, pin and binder deletes, the trade writes and the cursor advance commit in one web transaction. A crash rolls all of them back, and an overlapping run waits on the cursor lock, then reads past the new `seq`.
- The outbox read goes through the indexer connection, outside the web transaction.
- The pin cache `DEL` and the `trade-events` `PUBLISH` run after the commit and are not retried if Redis fails, because the rows are already past the cursor. Keep them after the commit: subscribers must never hear of writes that can still roll back.

### Outbox contract

- Only one writer appends to `list_event_outbox`, committing in id order: the processor, or locally `bun run simulate` with the processor off. The drain reads `id > seq` and never looks back, so a lower id committed late is skipped forever.
- A row `parseOutboxRow()` can't narrow fails the batch with `MalformedOutboxRowError`, and every retry reads the same row. Until someone fixes it, lists stop clearing, trades stop completing and the watermark stalls.
- A hot-block rollback deletes the `transfer` row but not its outbox row ([`apps/indexer/CLAUDE.md`](../indexer/CLAUDE.md)), so a null `transfer.hash` on the left join means rolled back. What the drain does with such a row is in [`docs/trades/drain.md`](../../docs/trades/drain.md).

### Watermark

- The cursor's `chain_time` is set to `greatest(chain_time, newest timestamp in the batch)`. It skips the initial null and never moves backwards.
- It moves only when rows are drained. A quiet chain leaves it behind the clock, and trade deadlines wait for it.

### Lists, pins and binders

- `planBatch()` in `src/outbox.ts` is pure and tested. It collects every transferred token, and `applyPlan()` deletes their list entries, pins and binder entries and clears binder covers on them.
- Pin caches are busted under both the address and the username `pinCacheKey()`, because the web app reads pins under either. Owners of pinned binders whose first page or cover changed are busted too.

### Trades

- `applyTrades()` runs in the same transaction, after `applyPlan()`, taking its locks in the order [`docs/locking.md`](../../docs/locking.md) gives for the drain.
- Its candidate read is unlocked; `lockLiveTrades()` drops a trade that ended since.

### Purge

- `purgeOutbox()` deletes rows older than 7 days whose id is at or below the applied `seq`. Keep both conditions, because age alone would delete rows a long drain outage never applied.
- An empty batch warns when the cursor is past the outbox's max id, which means the indexer DB was restored or replaced. It still purges.
- Changing the outbox's columns needs the release order in [`docs/migrations.md`](../../docs/migrations.md#order-for-outbox-changes).

## trade-timers

```
  chain tx timestamp --> outbox row --> drain --> list_drain_cursor.chain_time
                                                  (the watermark)
                                                           |
  trade-timers, every minute, three passes in order:       |
   1. expire pending offers        expires_at <= now()     |   DB clock
   2. decline pending offers on listings that aren't open  |   no time involved
   3. end accepted trades          deadline_at <= watermark <-- cursor FOR SHARE
        transition(time_out):
          nothing owed               -> completed  (endTrade)
          something sent, some owed  -> disputed   (disputeAtDeadline)
          nothing sent               -> timed_out  (endTrade; picks stay in the pool)
        then closeSpentListings once on every ended trade's listing

  each pass: its own transaction, <= 100 rows, users FOR KEY SHARE then rows in
  id order, the UPDATE re-checks the condition, trade-events published after commit
```

- Passes 1 and 2 scan for due offers before opening their transaction, so a minute with nothing due opens none. The scan is unlocked, so every guarded `UPDATE` re-checks its condition; an offer answered in the meantime is left alone.
- Due-row queries spell `kind = 'trade' AND status = '<literal>'` as raw SQL, so `trade_offers_expiry_idx` and `trade_offers_deadline_idx` serve them.
- Pass 2 locks no listing, because a listing never reopens.
- Pass 3 closes each listing only after all its due trades have ended, since one live trade keeps it open. Its posters need no extra lock: each is a trade's `from` party, already locked.
- Pass 3 logs an error and stops while the watermark is null. It logs an error and carries on when the watermark trails the clock by more than 10 minutes, which usually means the drain is stuck.
- What each outcome means for the trade and who is notified: [`docs/trades/lifecycle.md`](../../docs/trades/lifecycle.md).

## Shared trade helpers (`src/trades.ts`)

- `lockUsers()`, `lockLiveTrades()` and `lockListings()` each take their locks in one statement ordered by id.
- `endTrade()` and `disputeAtDeadline()` die (`Effect.die`) when their guarded update matches nothing, since the caller holds the lock.
- `endTrade()` returns its trade's listings instead of closing them. The caller runs `closeSpentListings()` once its batch has ended every trade, and inserts the `listing_closed` notifications it returns.
- `insertTradeNotifications()` skips recipients `lockUsers()` didn't return and recipients with an active ban.
- `banActive` is the SQL mirror of `isBanActive()` ([`packages/auth/README.md`](../../packages/auth/README.md)); change both together.
- The web app has its own copies of these writes on the promise driver (`apps/web/src/lib/server/trades/`). A change to one side's trade writes usually needs the other.

## Queues

```
  apps/web                        Redis                        apps/schedules
  list add commits
  queueTradeNotifications()
    offer(job) --------------->  "trade-notifications"  ---->  take loop (one per queue)
    Redis error -> Sentry,        PersistedQueue store           |
    never thrown                                                 v
                                                handle(job): source list still
                                                trade-active? no -> done
                                                insertNotifications, ON CONFLICT
                                                DO NOTHING (notifications_trade_dedup_idx)
                                                  |                     |
                                               success               failure
                                                  v                     v
                                     completed, id kept 30 days   retried with backoff;
                                     (cleanupLayer, hourly)       failed list after 10
```

- `@apollo/queue` defines one `Context.Service` per queue that owns its name, job `Schema` and Redis store, so the two apps can't disagree about it. Each app provides its own `Redis.Redis`.
- The web app offers after its transaction commits, so the worker never reads uncommitted data, and reports a Redis failure instead of throwing it, because a client retry would repeat the list add.
- Offers carry no id, so nothing dedups at offer time.
- Delivery is at least once, so a handler must be safe to run twice and must first check that its job still applies. A list deleted before the job runs would otherwise fail every insert on a foreign key.
- A job that fails to decode is marked failed at once. A job schema change old jobs can't decode needs a new queue name (`<name>-v2`); drain the old queue before removing it.
- `createQueueWorker()` (`src/queue.ts`) forks one take loop that logs a failure and sleeps 1 s before the next take. Run one loop per queue: with one web connection, more would only wait on each other.
- `cleanupLayer` keeps failed jobs forever and runs only in this app.
- Adding a queue: add its service to `@apollo/queue`, provide its layer in the web runtime (`apps/web/src/lib/server/runtime.server.ts`), create `src/queues/<name>.ts` exporting a `createQueueWorker()` layer with a `/** */` docblock, and merge it into `queueWorkers` in `main.ts`.

## Running locally

- `turbo dev --filter schedules` runs it in watch mode and starts the docker services. `bun run dev` here does the same without them.
- Stop every other copy (dev, or the compose `schedules` service that `DEV_SCHEDULES=true` starts) before `bun run task drain-outbox` or `bun run task trade-timers`, or that copy picks up the rows first.
- `bun test` covers only the pure planner (`tests/outbox.test.ts`). The drain's DB paths are checked by simulating the chain; its trade decisions are tested in `packages/trades` (`turbo test --filter @apollo/trades`).

### Simulating the chain

The processor stays off, and `bun run simulate` (`scripts/simulate.ts`) writes chain activity into the local indexer DB.

- `simulate init` sets the cursor's `seq` to the outbox's max id. Run it after restoring either database, or the drain skips the simulated rows. It doesn't touch `chain_time`.
- `simulate transfer --token <id> --to <address> [--at <iso>]` moves the objekt and appends a `transfer` row and its outbox row. `--at` sets the chain timestamp (default now).
- `simulate transferability --token <id> --transferable <true|false>` flips the objekt and appends a `transferability` outbox row.
- Each command writes in one indexer transaction and journals the objekt's previous state in the `simulate` schema.
- `simulate reset` reverts every simulated row from the journal. Web-side effects of drained rows stay, and the outbox sequence stays advanced, so a later row never reuses an id the drain has passed.
- Seed the watermark: simulate a transfer of an objekt in no list or trade to `0x000000000000000000000000000000000000dEaD`, then `bun run task drain-outbox`.
- Simulate a hot-block rollback: delete the `transfer` row an outbox row names before draining.

### Making timers due

Move a deadline behind the watermark or an expiry into the past, then `bun run task trade-timers`:

- `UPDATE trade_offers SET deadline_at = (SELECT chain_time FROM list_drain_cursor WHERE name = 'outbox-drain') - interval '1 second' WHERE id = '<trade>'`
- `UPDATE trade_offers SET expires_at = now() - interval '1 second' WHERE id = '<offer>'`

## Where to start

- New cron task: `src/functions/`, `SCHEDULED_TASKS`, and the `ScheduledTask` requirement union if it needs a new service.
- What the drain does to lists, pins and binders: `src/outbox.ts` (pure, tested), then `applyPlan()`.
- What the drain does to trades: `packages/trades/src/transfers.ts` first, then `applyTrades()` and `breakOffers()` in `src/functions/drain-outbox.ts`.
- Timer behaviour: `src/functions/trade-timers.ts`, `transition()` and `offerTransition()` in `packages/trades/src/lifecycle.ts`, and `src/trades.ts`.
- New background job from the web app: `packages/queue`, then `src/queues/`.
