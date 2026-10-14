# Indexer App

This is a [Subsquid SDK](https://docs.sqd.ai/sdk/overview/) application for indexing Modhaus objekts on the Abstract blockchain. It processes and saves:

- every objekt collection type
- every unique objekt NFT
- every ownership change/transfer
- every COMO token balance change
- every gravity vote

## Technology Stack

- **Subsquid SDK** - EVM blockchain indexing framework
- **TypeORM** - Database ORM with manual model management
- **Bun** - Package manager and runtime (>= 1.4)
- **PostgreSQL** - Primary database

## Development Workflow

### Making Schema Changes

When adding or modifying entities, follow this exact workflow:

1. **Update GraphQL Schema:** Edit `schema.graphql` with new entities/fields
2. **Update TypeORM Model:** Manually edit corresponding file in `src/model/generated/`
3. **Create Migration:** Write a manual migration in `db/migrations/` following naming convention: `{timestamp}-Data.js`
4. **Sync Drizzle Schema:** Update corresponding schema in `/packages/database/src/indexer/schema.ts`
5. **Verify Changes:** Run `turbo typecheck` and `turbo lint`

### Migration Guidelines

Do not run `sqd`, `subsquid-commands`, or `squid-*` commands — they wipe the migrations directory and generate broken models. Migrations are written by hand, never generated:

- Follow naming convention: `{timestamp}-Data.js`
- Include both `up()` and `down()` methods
- Test migrations locally before committing
- Include a short comment detailing what the change is for (ie: what does a new index seek to improve)

### Online DDL

The Subsquid migration runner hard-codes `transaction: 'all'`, so `CONCURRENTLY` DDL cannot run through migrations. Run any DDL manually, then ship an idempotent `IF [NOT] EXISTS` migration as the record.

## Core Patterns & Conventions

### Address Normalization

Always normalize addresses to lowercase using the `addr()` utility:

```typescript
import { addr } from "@apollo/util";

const normalized = addr(rawAddress); // converts to lowercase
```

### UUID Generation

Use Node's built-in crypto for unique IDs:

```typescript
import { randomUUID } from "node:crypto";

new Transfer({ id: randomUUID(), ... });
```

### Batch Processing

Use the `chunk()` utility for parallel processing:

```typescript
import { chunk } from "@apollo/util";

await chunk(items, env.COSMO_PARALLEL_COUNT, async (chunk) => {
  const results = await Promise.allSettled(chunk.map(process));
  // handle results
});
```

### Buffer Pattern

Reduce database queries by maintaining in-memory Maps:

```typescript
const buffer = new Map<string, Entity>();

// Check buffer before DB
let entity = buffer.get(key);
if (!entity) {
  entity = await ctx.store.get(Entity, { where: { key } });
  if (entity) buffer.set(key, entity);
}
```

### Upsert Strategy

Always use upsert to handle both new and existing records:

```typescript
await ctx.store.upsert(Array.from(buffer.values()));
```

### Error Handling

A batch commits and the processor advances past its blocks, so anything skipped inside one is lost permanently — a skipped transfer is never written, and its objekt keeps the owner from its previous transfer with nothing to correct it later. Let the failure escape instead: Subsquid rolls the batch back, exits, and reprocesses the same blocks on restart, so nothing is lost but time. Settle every call before throwing so the log can name what failed and how many — one bad item and the API being down look identical in a crash loop otherwise.

```typescript
const results = await Promise.allSettled(
  items.map((item) => fetchWithRetry(item.id)),
);

const failed: string[] = [];
for (const [index, item] of items.entries()) {
  const result = results[index];
  if (result?.status === "fulfilled") {
    // use result.value
  } else {
    failed.push(item.id);
  }
}

if (failed.length > 0) {
  ctx.log.error(
    `failed for ${failed.length}/${items.length}: ${failed.join(", ")}`,
  );

  const error = new Error("fetch failed", { cause: firstRejection });
  Sentry.captureException(error, {
    level: "fatal",
    fingerprint: ["indexer-metadata-fetch-failed"],
    tags: { failure: "metadata" },
    extra: { failed, chunkSize: items.length },
  });
  await Sentry.flush(2000);
  throw error;
}
```

Retry generously before giving up (`fetchMetadataV3` in `@apollo/cosmo` allows 5 minutes), because throwing costs a re-fetch of every item in the batch. Log-and-continue is only for work whose absence leaves no wrong row behind, such as a transferability update whose objekt does not exist.

Pin a fixed `fingerprint` and carry the real rejection as `cause`: one issue accumulates every failed batch whatever COSMO returned, so an event-frequency alert counts batches instead of splitting across error shapes. Flush before throwing — Subsquid exits on the way out and drops queued events. Sentry only initializes when `SENTRY_DSN` is set, so local runs report nothing.

### Image Mirroring

Before each chunk's collection upsert, `mirrorImages` (`src/images.ts`) mirrors the front and back image of every collection whose `frontImageVersion`/`backImageVersion` doesn't match a hash of its source URL into R2 via `@apollo/image` (see its README), four at a time, and sets the version on the batch's own instances.

### Collection Stats

`collection_stats` holds each collection's `objekt_count` (every objekt row, spun included) and `spun_count` (rows owned by `Addresses.SPIN`) for apps/web's mint-count sorts. Triggers on `objekt` maintain it (migration `1791327933173-Data.js`): inserts and deletes adjust both counts, and owner changes to or from spin adjust `spun_count`. The processor never reads or writes it, so hot-block rollbacks and hand-run repairs to `objekt` stay counted without any TypeScript changes. A collection's row exists only while it has objekts.

`collection_market_stats` holds the USD floor, listing count and latest listing time of each listed collection. apps/schedules' `sync-market-stats` owns it, syncing from the web DB every minute, and apps/web's `/market` joins it to `collection` to filter, sort and page in one query. The processor never touches it.

### Serial Numbering

COSMO stopped returning serials at the v1 metadata cutoff, so `src/serials.ts` sets the serial of each objekt minted after it before the chunk's upsert, using `@apollo/serial-estimation` (see the serials section of `docs/cosmo.md`). A digital mint above its collection's cached top takes the next serial; anything else is estimated from its whole collection plus the chunk's new objekts. The new objekts take the result, and so do a digital collection's stored objekts whose serial it changed, because a late mint shifts every one above it. Those are written through the store (so a hot-block rollback restores them) and set on the chunk's own buffered instances, whose upsert would otherwise write the old serial back. Stored physicals are never renumbered here: `apps/schedules` recomputes collections daily and applies confirmed serials. It also maintains `serial_reservation`: an online mint 20 or more ids above the highest so far opens a range, and a late online mint below it splits the range it lands in, so the table matches what the backfill computes from every mint. The reads go through the store's `EntityManager` with raw SQL, because `Store` can't select single columns or scan id ranges.

### List Event Outbox

`list_event_outbox` feeds apps/schedules' `drain-outbox`. The processor only appends: a `transfer` row for every transfer except mints, and a `transferability` row for every token a `batchUpdateObjektTransferability` call updates. Ids follow processing order, so within one batch every transfer row precedes every transferability row. A `NOT VALID` check enforces each type's columns on new rows without scanning old ones.

The processor runs with `supportHotBlocks`, and a hot-block rollback doesn't remove outbox rows: the change log records each insert by entity id, and a bigserial row has no id until the insert has run. The drain detects this through the row's `transfer_id`.

## Key Files

- `schema.graphql` — source of truth for entity definitions; TypeORM entities in `src/model/generated/` are manually kept in sync with it (do not regenerate)
- `src/processor.ts` — Subsquid processor configuration; `src/parser.ts` — event parsing; `src/main.ts` — business logic
- `src/abi/` — auto-generated contract interfaces (objekt = ERC-721 NFT, como = ERC-1155 token, gravity = voting)
- `db/migrations/` — manual migrations only

Entity fields and relations are defined in `schema.graphql` and mirrored in `packages/database/src/indexer/schema.ts` — read those directly rather than relying on prose.

## Important Gotchas

1. **Runtime:** Bun (>= 1.4) for build and production. `bun run start` applies `db/migrations` before starting the processor
2. **`@subsquid/http-client` patch:** `patches/@subsquid%2Fhttp-client@1.8.1.patch` removes the hard-coded `compress: true` fetch option, which Bun's native fetch treats as "gzip the request body" and JSON-RPC endpoints reject with `-32700 parse error`. The patch is version-pinned and must be re-created when bumping the package
3. **UUID Type:** Uses `varchar(36)` instead of PostgreSQL `uuid` type due to Subsquid casting limitations
4. **Address Normalization:** Always use `addr()` - never store raw addresses
5. **GraphQL Server:** Not actively used - schema only defines entity structure
6. **Keep Drizzle in Sync:** All model changes must be reflected in `/packages/database/src/indexer/schema.ts`
7. **Bun Compatibility:** `glob`, `lru-cache`, and `path-scurry` are direct dependencies only to pin Bun-compatible versions over the transitive ones — nothing imports them, so keep them when pruning unused dependencies
8. **Relation properties use `Relation<T>`:** the model files import each other circularly and the build emits ESM, so a bare class type in `emitDecoratorMetadata` output throws a TDZ `ReferenceError` at startup
9. **Autovacuum reloptions are mostly live-only:** `objekt`, `transfer`, `collection`, `collection_owner` and `list_event_outbox` have per-table autovacuum settings applied directly in production (not in any migration) because the default thresholds let the visibility map go stale under the constant owner-rewrite churn; `progress_leaderboard` gets its settings from its own migration. All of them are recorded under "Current VACUUM settings" in `docs/database.md` — re-apply the live-only ones by hand after any from-scratch database rebuild.
10. **Leaderboard triggers:** statement-level triggers on `objekt` and a row trigger on `collection` keep `collection_owner` and `progress_leaderboard` current, and statement-level triggers on `progress_leaderboard` keep `progress_histogram` (owners per count, for ranks) in step with it (migration `1792234623962`), so every objekt write, including hot-block rollbacks, runs through them. For a full reindex from the start block, disable the triggers, reindex, then truncate all three tables and re-run the migration's backfill. `collection.unobtainable` is set by hand and `handleCollection` must never assign it; a hot-block rollback restores Subsquid's pre-block row snapshot, so a flag flipped while a block touching that collection is still unfinalized can be reverted.

## Processing Flow

```
Blockchain Events
    ↓
parser.ts (parseBlocks)
    ↓
main.ts (business logic)
    ├── Buffer entities in Maps
    ├── Fetch metadata in batches
    ├── Handle errors gracefully
    └── Upsert to database
    ↓
TypeORM Store
    ↓
PostgreSQL Database
```
