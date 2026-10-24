# Database

The project uses Drizzle ORM and the Bun SQL Postgres driver, with two connections:

- `import { db } from "@/lib/server/db"`
  - Postgres connection for general user data
- `import { indexer } from "@/lib/server/db/indexer"`
  - Postgres connection for querying the blockchain indexer for objekt data.
  - tables are defined in `packages/database/src/indexer/schema.ts` — read it rather than relying on prose

`turbo db:generate` generates migration files.

## Derived & Projection Types

Types that derive directly from a Drizzle schema are stored alongside the schemas in the `@apollo/database` package and inferred via `typeof schema.$inferSelect` / `$inferInsert`:

```ts
import { type CosmoAccount, type User } from "@apollo/database";
import { type Collection, type Objekt } from "@apollo/database/indexer";
```

New **projection / joined / UI** types — anything shaped for the app rather than 1:1 with a table — go in `apps/web/src/lib/universal/`, **not** in the database package (`packages/database/src/web/types.ts`).

### Adding indexer columns that flow to the UI

When a new indexer `collection` column needs to reach the UI's objekt types, declare it on the cosmo types (`ObjektBaseFields` and `BFFCollectionGroupCollection` in `packages/cosmo/src/types/objekts.ts`) rather than defaulting it in converters. `mapLegacyObjekt` synthesizes a `CosmoObjekt` from indexer data via spread, so the field is already structurally present at runtime — declaring it just makes TS reflect that, letting the converters in `objekt-conversion.ts` read it without casts or hardcoded defaults. `IndexedObjekt` (Drizzle infer) picks up new columns automatically. Don't mistake the cosmo types for "upstream API only" — they're the shared shape across all objekt sources.

## Immutable Collection Keys

`collection.slug` and `collection.collectionId` are immutable lookup keys (`collectionId = "<Season> <Member> <CollectionNo>"`, `slug = slugifyObjekt(collectionId)`). Never recompute them when editing a collection — even if the fields they derive from change — as they are the stable join/lookup keys for the web app and the processor's upsert logic. Update handlers persist only the explicitly editable fields; derived media keys reuse the row's existing slug.

## Timestamp Columns

Use `mode: "date"`, never `mode: "string"`. `bun:sql` returns `Date` objects; `mode: "string"` emits a zoneless, space-separated string that breaks older Safari and throws on `undefined`. `mode` is a JS-only concern — changing it requires no migration.

## Relational Query Builder (v2)

The project uses Drizzle ORM 1.0's relational query builder. For most queries, use the relational API:

```ts
const profile = await db.query.cosmoAccounts.findFirst({
  where: {
    username: "username",
  },
  with: {
    lists: true,
  },
});
```

The relational query builder's `where` takes the object-based filter syntax below. The `eq()` / `and()` / `or()` builder functions and the `(table, { eq }) => ...` callback form belong to the select query builder and are rejected by the relational API.

Drizzle throws on an explicit `undefined` filter value (including `where: undefined`) and the types don't catch it, so write an optional scalar filter as `column: value ?? EmptyFilter`, an optional RAW as ``RAW: cond ? (t) => sql`...` : EmptyFilter``, and an optional array filter as `column: arr.length ? { in: arr } : EmptyFilter`, because `in: []` matches nothing.

### Available Filters

The `where` clause accepts an object with the following operators:

```ts
// Top-level operators
where: {
  OR: [],        // Array of filter objects
  AND: [],       // Array of filter objects
  NOT: {},       // Single filter object
  RAW: (table) => sql`${table.id} = 1`,  // Raw SQL escape hatch

  // Filter by relations
  [relation]: {
    // Nested filter object for related table
  },

  // Filter by columns
  [column]: {
    // Logical operators
    OR: [],
    AND: [],
    NOT: {},

    // Comparison operators
    eq: 1,              // equals
    ne: 1,              // not equals
    gt: 1,              // greater than
    gte: 1,             // greater than or equal
    lt: 1,              // less than
    lte: 1,             // less than or equal

    // Array/set operators
    in: [1, 2, 3],      // in array
    notIn: [1, 2, 3],   // not in array

    // String operators
    like: "pattern",    // SQL LIKE
    ilike: "pattern",   // case-insensitive LIKE
    notLike: "pattern",
    notIlike: "pattern",

    // Null operators
    isNull: true,
    isNotNull: true,

    // Array column operators (for PostgreSQL arrays)
    arrayOverlaps: [1, 2],   // overlaps with array
    arrayContained: [1, 2],  // is contained by array
    arrayContains: [1, 2],   // contains array
  },
}
```

### Examples

```ts
// Simple equality (shorthand)
const user = await db.query.users.findFirst({
  where: { id: 1 }, // Shorthand for { id: { eq: 1 } }
});

// Simple equality (explicit)
const user = await db.query.users.findFirst({
  where: { id: { eq: 1 } },
});

// Multiple conditions (implicit AND)
const users = await db.query.users.findMany({
  where: {
    age: { gte: 18 },
    status: { eq: "active" },
  },
});

// OR conditions
const users = await db.query.users.findMany({
  where: {
    OR: [{ age: { lt: 18 } }, { status: { eq: "inactive" } }],
  },
});

// Complex nested conditions
const users = await db.query.users.findMany({
  where: {
    AND: [
      { age: { gte: 18 } },
      {
        OR: [{ status: { eq: "active" } }, { verified: { eq: true } }],
      },
    ],
  },
});

// Filter by relations
// Get users who have at least one published post
const users = await db.query.users.findMany({
  where: {
    posts: {
      published: { eq: true },
    },
  },
  with: {
    posts: true,
  },
});

// Combine main table filter with relation filter
// Get users with id > 10 who have posts starting with 'Hello'
const users = await db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: {
      content: { like: "Hello%" },
    },
  },
});

// NOT operator
const users = await db.query.users.findMany({
  where: {
    NOT: {
      status: { eq: "banned" },
    },
  },
});

// Prefix search on user input; prefixPattern() (lib/server/util.server.ts) escapes the query's % and _
const users = await db.query.users.findMany({
  where: {
    username: { ilike: prefixPattern(query) },
  },
});

// Array operators (PostgreSQL)
const collections = await db.query.collections.findMany({
  where: {
    tags: { arrayContains: ["featured"] },
  },
});
```

## Query Builder (for complex queries)

For complex queries with multiple joins, aggregations, or custom SQL, use the query builder:

```ts
const cosmo = await db
  .select()
  .from(cosmoAccounts)
  .leftJoin(objektLists, eq(profiles.userId, lists.userId))
  .where(eq(cosmoAccounts.username, "username"));
```

The query builder is where `eq()`, `and()`, `or()` and the other builder functions are used.

Do not write raw SQL in `sql` template tags unless absolutely necessary due to the lack of Drizzle function. Things like `array_agg()`, `CASE ... WHEN` statements etc.

## Counts & Aggregates

Postgres returns `COUNT`, `SUM`, and window functions (`count(*) over()`, `row_number()`, …) as `bigint`, and bun:sql hands `bigint` back as a JS `BigInt`. `JSON.stringify` throws on `BigInt`, so any such value reaching a `Response.json` route or a `createServerFn` return 500s with `cannot serialize BigInt` — the `sql<number>` annotation is compile-time only and does not coerce. Cast and map every raw aggregate: ``sql<number>`count(*)::int`.mapWith(Number)``. Drizzle's `count()` / `db.$count()` helpers and `bigint` columns declared `mode: "number"` are already safe; `mode: "bigint"` columns return a real `BigInt` and must stay out of serialized payloads.

## Migrations

- Put CHECK constraints in the Drizzle **schema**, not in hand-edited SQL.
- A descending index column needs `.desc().nullsFirst()`. Drizzle's bare `.desc()` emits `DESC NULLS LAST`, which Postgres can't use for a plain `ORDER BY col DESC` (that means `NULLS FIRST`), even on a `NOT NULL` column, so the planner falls back to another index or a sort. `fx_rates_currency_date_idx` is declared this way.
- `db:migrate` and production's `migrate.ts` apply **every pending migration in one transaction**: both end in drizzle-orm's `migrate()` (drizzle-kit 1.0 rc.5 hands it the pending folders), which runs them all inside a single `db.transaction` (`pg-core/async/session.js`). Neither the `--> statement-breakpoint` separator nor a separate migration file starts a new transaction. Consequences for a release:
  - A new enum value can't be used by any migration in the same release: Postgres refuses a value added by `ADD VALUE` until the transaction that added it commits.
  - A check that fails (a `DO $$ … RAISE EXCEPTION … $$` block) rolls back the whole release, earlier pending migrations included, and the new container exits before starting the server.
  - Any `ALTER TABLE` or index build on a hot table (`user`, `session`, `cosmo_account`) holds its lock until every pending migration commits, so the previous image's queries on that table stall for the whole release's migrate time. A new table's foreign key to a hot table counts too: it takes `SHARE ROW EXCLUSIVE` on the referenced table, which blocks its writes (such as `cacheAccounts()` upserting `cosmo_account`) but not its reads. Dropping a foreign key that references a hot table, including dropping a table that has one, takes `ACCESS EXCLUSIVE` on the referenced table, which blocks its reads too until the release commits (verified on Postgres 17). Rehearse a release's migrate time on a restored baseline.
- Scripts live in `apps/web`: `db:generate` (author), `db:check` (validate the migration chain), `db:migrate` (apply locally — production containers run `migrate.ts`, the same drizzle-orm migrator, on start), `db:push` (dev-only direct schema sync, no files), `db:upgrade` (`drizzle-kit up`, converts snapshots written by an older drizzle-kit — `generate`/`check` refuse them until it runs). Migrations use the drizzle-kit 1.0 per-directory format: `drizzle/<ts>_<name>/` with a `migration.sql` and an incremental `snapshot.json`. The first migration's snapshot holds the full schema (`"type": "base"`); every later one holds only the changes from its parent (`"type": "diff"`) plus statement footprints that drizzle-kit uses to check whether migrations from different branches can both apply. drizzle-kit rebuilds the schema by replaying the chain, so never hand-edit or delete a migration folder — it breaks every migration after it.
- **Data backfills** (`UPDATE`, one-shot fixes) can't be generated by drizzle. Scaffold an empty migration with `bun run db:generate --custom --name <name>`, then write the SQL by hand. Folders apply in timestamp order, so a hand-written check that must run before a generated migration (such as a duplicate check ahead of a new unique index) is scaffolded before the schema edit, and is re-scaffolded the same way when migrations are consolidated.
- **Running `generate`/`check` non-interactively** (agents, CI): pass `--output json` for a machine-readable envelope (e.g. `{"status":"no_changes"}`, `{"status":"ok"}`) instead of the TUI. When `generate` hits a decision it can't infer — a column/table rename vs drop+add, or a `confirm_data_loss` destructive change — `--output json` emits a `missing_hints` envelope describing what's needed rather than blocking on a prompt; answer up front with `--hints '[...]'` or `--hints-file <path>` and re-run. `db:migrate` has no such flags and needs no hints.

## Append-only audit tables

`staff_audit` and `cosmo_link_audit` record who did what and are only ever inserted into; `cosmo_link_audit` rows are written in the transaction that changes the link (`docs/auth.md`, COSMO link history). Deleting an account deletes the user row (`docs/auth.md`, Account deletion), so every foreign key to `user.id` is `ON DELETE CASCADE` or `SET NULL`: a `NO ACTION` key would make the delete fail. The audit tables must outlive the accounts they name, so their user columns (`staff_audit.staff_id` and `cosmo_link_audit.user_id`) are plain text ids with no foreign key, and their relations to `user` are declared in `relations.ts` without a constraint; a missing user reads back as null and shows as "Deleted user". Order their rows by `id`, not `created_at`: `defaultNow()` is `now()`, the transaction's start time, so every row one transaction writes shares a timestamp.

## Current VACUUM settings

```sql
ALTER TABLE objekt SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 100000,
  autovacuum_vacuum_insert_scale_factor = 0,
  autovacuum_vacuum_insert_threshold = 100000,
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold = 50000,
  autovacuum_vacuum_cost_delay = 0
);

ALTER TABLE transfer SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 100000,
  autovacuum_vacuum_insert_scale_factor = 0,
  autovacuum_vacuum_insert_threshold = 100000,
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold = 50000,
  autovacuum_vacuum_cost_delay = 0
);

ALTER TABLE collection SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.01
);

ALTER TABLE list_event_outbox SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold = 500
);

ALTER TABLE collection_owner SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 10000,
  autovacuum_vacuum_insert_scale_factor = 0,
  autovacuum_vacuum_insert_threshold = 10000
);

ALTER TABLE progress_leaderboard SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 10000,
  autovacuum_vacuum_insert_scale_factor = 0,
  autovacuum_vacuum_insert_threshold = 10000
);
```
