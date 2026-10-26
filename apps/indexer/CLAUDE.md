# apps/indexer

A Subsquid `EvmBatchProcessor` that follows MODHAUS' objekt, COMO and gravity contracts on Abstract and writes the indexer database, which is the source of truth for ownership. [README.md](README.md) has the overview and how to run it, [`docs/cosmo.md`](../../docs/cosmo.md) the domain concepts, and [`docs/database.md`](../../docs/database.md) how other apps read this database.

## Data sources

Every source is subscribed from `COSMO_START_BLOCK` in `src/processor.ts`, decoded in `src/parser.ts` and handled in `src/main.ts`.

| Source                                                | Kind              | Becomes                                                   |
| ----------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| `Addresses.OBJEKT` `Transfer`                         | log               | `transfer`, `objekt`, `collection`, outbox `transfer` row |
| `Addresses.OBJEKT` `batchUpdateObjektTransferability` | transaction input | `objekt.transferable`, outbox `transferability` row       |
| `Addresses.COMO` `TransferSingle` / `TransferBatch`   | log               | `como_balance`                                            |
| `Addresses.GRAVITY` `Voted`                           | log               | `vote` with `candidate_id` null                           |
| `Addresses.GRAVITY` `reveal`                          | transaction input | `vote.candidate_id`                                       |

- A log or input that fails to decode is skipped silently by the parser.
- Addresses are lowercased with `addr()` at parse time; never store a raw address.

## Feature flags

- `ENABLE_OBJEKTS` gates transfers, transferability and COMO balances. `ENABLE_GRAVITY` gates votes and reveals.
- The processor subscribes to every source and advances its height whatever the flags say, so blocks processed with a flag off are never revisited for that data.

## A batch

Everything in a batch runs in one Subsquid transaction and commits together with the new height.

```
  Abstract RPC --> EvmBatchProcessor: blocks since the last height
                          |
  parseBlocks        transfers | transferability | como | votes | reveals
                          |
  [ENABLE_OBJEKTS]        v
  startSerialBatch   batch starts <= last height? hot-block rollback: clear tops, frontier
  +-- per chunk of COSMO_PARALLEL_COUNT transfers -------------------------------+
  |  fetch v3 metadata for every transfer (retries up to 5 min)                  |
  |    any failure -> Sentry fatal, flush, THROW: the batch rolls back, the      |
  |                   process exits, the same blocks are redone on restart       |
  |  handleCollection  load by slug, create or refresh from metadata             |
  |  handleObjekt      new: serial 0, transferable true / known: owner, received |
  |  numberNewObjekts  serial_reservation, estimates, renumber stored digital    |
  |  mirrorImages      R2; a failure never fails the batch                       |
  |  upsert collection -> objekt -> transfer                                     |
  |  insert list_event_outbox  type=transfer, mints excluded                     |
  +------------------------------------------------------------------------------+
                          |
  transferability    set objekt.transferable, insert outbox type=transferability
  COMO balances      chunks of 2000; from -= value, to += value; skip Addresses.*
                          |
  [ENABLE_GRAVITY]        v
  votes              one vote row per Voted log
  reveals            reveal offset + i = position in the poll's (block_number,
                     log_index) order; only fills a null candidate_id
                          |
                          v
  commit: rows + height; objekt triggers update collection_stats and the leaderboard
```

## Metadata

- Every transfer fetches `/bff/v3/objekts/nft-metadata/{id}`, not only mints, because collections are discovered and refreshed from metadata. A COSMO outage halts all indexing, plain ownership changes included.
- `normalizeV3` in `packages/cosmo` maps v3 into the v1 shape, and v3 lacks several fields:

| Field                 | Stored from v3        | Consequence                                                                          |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `objekt.serial`       | `0`                   | `numberNewObjekts` estimates it for objekts minted after the cutoff                  |
| `objekt.transferable` | `true`                | the real value arrives only with a later `batchUpdateObjektTransferability` call     |
| `backImage`           | `""`                  | `handleCollection` keeps a stored back image; a v3-era collection has none to mirror |
| `contract`            | zero address          | new collections carry no contract address                                            |
| `textColor`           | `#000000`             | set once on create; staff can correct it                                             |
| `accentColor`         | the background colour | set once on create; staff can correct it                                             |

## Writes and the store

- `ctx.store.upsert` writes every mapped column of the instance. An edit made by someone else between the processor's load and its upsert is overwritten, and image mirroring can stretch that window to minutes.
- Outbox rows are `insert`ed, never upserted, because Postgres generates their bigserial id.
- `collection`, `transfer`, `como_balance` and `vote` ids are `randomUUID()` stored as `varchar(36)`, because Subsquid casts ids to text and a `uuid` column breaks. `objekt.id` is the token id as varchar.
- The chunk buffers (`Map`s in `main.ts`) let repeated tokens and collections in one chunk see each other's changes before the upsert.

Who writes each `collection` column decides whether an edit survives:

| Columns                                                                                                               | Written by                                                                                   |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `season`, `member`, `artist`, `collection_no`, `class`, `como_amount`, `on_offline`, `thumbnail_image`, `front_image` | the processor, from metadata on every transfer: a staff edit lasts until the next transfer   |
| `back_image`                                                                                                          | the processor, only when metadata has one                                                    |
| `contract`, `created_at`, `collection_id`, `slug`, `text_color`, `background_color`, `accent_color`                   | the processor on create only; staff edit the colours at `/admin/collections`                 |
| `front_image_version`, `back_image_version`                                                                           | `mirrorImages`, and staff re-mirrors at `/admin/collections`                                 |
| `unobtainable`, `has_audio`, `front_media`, `band_image_url`                                                          | staff only (`/admin/collections`, `/admin/bands`); `handleCollection` must never assign them |

## Hot-block rollbacks

Blocks newer than `RPC_FINALITY` are hot, and Subsquid restores its pre-block snapshot of every entity they touched when the chain reorganises.

| Written by                                                                  | On rollback                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| store upserts of `objekt`, `collection`, `transfer`, `como_balance`, `vote` | restored, including serials `renumberStored` wrote through the store        |
| a hand edit to a row a hot block touched                                    | reverted to the snapshot                                                    |
| trigger tables (`collection_stats`, `collection_owner`, `progress_*`)       | stay correct, because the restore's writes fire the triggers                |
| `list_event_outbox` inserts                                                 | not removed: the change log keys inserts by id and a bigserial has none yet |
| `serial_reservation` (raw SQL)                                              | not reverted                                                                |
| `tops` and `frontier` in `src/serials.ts`                                   | cleared by `startSerialBatch`                                               |
| R2 images                                                                   | kept; harmless, because objects are keyed by a hash of the source URL       |

The drain spots a rolled-back transfer by its missing `transfer` row (see [`docs/trades/drain.md`](../../docs/trades/drain.md)).

## Errors

- Never skip or log-and-continue on work whose absence leaves a wrong row, because a committed batch is never reprocessed: a skipped transfer leaves its objekt with a stale owner for good.
- Throwing is safe: Subsquid rolls the batch back, exits, and redoes the same blocks on restart.
- Before throwing, settle every call (`Promise.allSettled`) and log `failed/total` with the ids, so one bad item and a COSMO outage can be told apart.
- Capture one Sentry event with a fixed `fingerprint` and the first rejection as `cause`, so every failed batch lands in one issue and alerts count batches.
- `await Sentry.flush(2000)` before the throw, because Subsquid exits on the way out and drops queued events.
- Log-and-continue is only for work that leaves nothing wrong behind: a transferability update for an unknown objekt, and image mirroring.
- Sentry initialises only when `SENTRY_DSN` is set (`src/instrument.ts`).

## Image mirroring

`mirrorImages` (`src/images.ts`) mirrors each side of a chunk's collections through `@apollo/image` (see [its README](../../packages/image/README.md)) before the collection upsert.

- A side is mirrored when its source URL is non-empty and its stored version differs from `objektImageRef(...).version`.
- Four mirrors run at a time, each capped at 60 seconds, and success sets the version on the instance the upsert writes.
- A failure is logged and sent to Sentry (fingerprint `indexer-image-mirror-failed`); it never fails the batch.
- A broken source image gets a one-hour cooldown. Any other failure opens a five-minute breaker that skips all mirroring. Both live in memory only.
- A null version makes readers fall back to COSMO's URL.

## Serial numbering

`numberNewObjekts` (`src/serials.ts`) numbers each chunk's new objekts with `@apollo/serial-estimation`. The model is in [`docs/cosmo.md`](../../docs/cosmo.md#serials).

- Digital mints update `serial_reservation` first: a jump of `RESERVATION_MIN_GAP` or more above `frontier` opens a range, and a late mint below it splits the stored range it lands in.
- Only objekts minted after `SERIAL_CUTOFF` get a serial. A digital mint above its collection's cached top counts on from it; anything else is estimated from the whole collection.
- A late digital mint shifts every stored objekt above it. `renumberStored` writes those through the store in token-id order, the order apps/schedules writes in, so overlapping row locks can't deadlock.
- Renumbered serials are also set on the chunk's buffered instances, because the chunk's upsert would otherwise write the old serial back.
- Stored physicals and coupon sets are never renumbered here; apps/schedules' `recompute-serials` repairs them.
- Reads use the store's `EntityManager` (`ctx.store["em"]()`) with raw SQL, because `Store` can't select single columns or scan id ranges.
- `objekt.id` is varchar, so token-id ranges are queried per digit count (`tokenIdRanges()`); only ids of equal length compare in numeric order as text.
- `loadReservations` is one of three copies of the reservation loader; [`packages/serial-estimation/README.md`](../../packages/serial-estimation/README.md) lists them. Change all three together.

## Outbox

`list_event_outbox` feeds apps/schedules' `drain-outbox` (see [`apps/schedules/CLAUDE.md`](../schedules/CLAUDE.md)).

- The processor only appends: a `transfer` row for every transfer except mints, and a `transferability` row for every known token a transferability call updated.
- `collection_id` holds the collection slug, not its UUID, so the drain matches it directly against the web DB's `objekt_list_entries.collection_id`.
- Ids follow processing order: within a batch, every transfer row precedes every transferability row, whatever the on-chain order.
- `CHK_list_event_outbox_type` is `NOT VALID`: it checks each type's columns on new rows without scanning old ones.

## Trigger-maintained tables

The processor never writes these; triggers on `objekt` and `collection` do.

| Table                                                            | Migration       | Holds                                                                    |
| ---------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| `collection_stats`                                               | `1791327933173` | objekt and spun counts per collection; a row exists while it has objekts |
| `collection_owner`, `progress_leaderboard`, `progress_histogram` | `1792234623962` | copies per owner, progress counts and the rank histogram                 |

- The leaderboard tables exclude the `Welcome` and `Zero` classes, unobtainable collections and `Addresses.SPIN`.
- A change to a collection's member, season, `on_offline`, class or `unobtainable` moves its owners' counts.
- For a full reindex from the start block: disable the leaderboard triggers, reindex, truncate the three tables, then re-run the backfill in migration `1792234623962`.
- `collection_market_stats` and `member` belong to apps/schedules (`sync-market-stats`, `sync-members`).

## Schema changes

1. Edit the TypeORM model in `src/model/generated/`.
2. Write a migration in `db/migrations/` named `{timestamp}-Data.js`, with `up()`, `down()` and a short comment saying why (what an index speeds up, what a column is for).
3. Mirror the change in `packages/database/src/indexer/schema.ts`, which apps/web, apps/schedules and the serial-estimation scripts read through Drizzle.
4. Update `schema.graphql` to match the models.
5. Run `turbo typecheck` and `turbo lint`.

- Never run the `commands.json` generators: `migration:generate` depends on `migration:clean`, which deletes `db/migrations`, and `codegen` overwrites the hand-written models. `squid-typeorm-migration apply` is safe; `bun run start` runs it.
- Relation properties are typed `Relation<T>`, because the models import each other circularly and the ESM build's decorator metadata otherwise throws a TDZ `ReferenceError` at startup.
- The runner applies every pending migration in one transaction, so `CONCURRENTLY` and long backfills run by hand first and the migration ships as an idempotent record ([`docs/migrations.md`](../../docs/migrations.md#one-transaction-per-release)); `1792234623962` shows the pattern.
- Some per-table autovacuum settings are applied by hand, not by migrations; [`docs/migrations.md`](../../docs/migrations.md) records them.

## Runtime quirks

- The root `patches/@subsquid%2Fhttp-client@1.8.1.patch` removes `compress: true`, which Bun's fetch reads as "gzip the request body" and RPC nodes reject with `-32700`. Re-create it when bumping the package.
- `glob`, `lru-cache` and `path-scurry` are direct dependencies only to pin Bun-compatible versions; nothing imports them, so keep them when pruning.
- `bun run build` uses `tsc -p tsconfig.build.json`, because the TypeORM models need decorator metadata emit.
- `DB_NAME`, `DB_READ_USER` and `DB_READ_PASS` are required by `src/env.ts` but never read.

## Where to start

- New on-chain source: subscription in `src/processor.ts`, decoder in `src/parser.ts`, handler in `src/main.ts`, then the schema change steps.
- New collection column from metadata: `normalizeV3` in `packages/cosmo`, `handleCollection`, then the schema change steps.
- Serial rule change, coupon set or claim block: [`packages/serial-estimation/README.md`](../../packages/serial-estimation/README.md).
- Mark a collection unobtainable: [`docs/cosmo.md`](../../docs/cosmo.md#unobtainable-collections).
