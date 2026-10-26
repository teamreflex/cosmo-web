# Migrations

Each database has its own source of truth and its own runner, and both runners apply every pending migration in one transaction.

```
  WEB DB                                        INDEXER DB
  packages/database/src/web/schema.ts           apps/indexer/schema.graphql
  packages/database/src/auth.ts                 apps/indexer/src/model/generated/*.ts
         |                                             |  both edited by hand
         |  drizzle-kit generate (apps/web)            v
         v                                      apps/indexer/db/migrations/<ms>-Data.js
  apps/web/drizzle/<ts>_<name>/                   up() + down(), IF [NOT] EXISTS
    migration.sql + snapshot.json                      |
         |                                             |
         |  apps/web/migrate.ts, before the            |  squid-typeorm-migration apply,
         |  web server starts; locally db:migrate      |  in the processor's start script
         v                                             v
  +---------------------------------+           +---------------------------------+
  | every pending migration in ONE  |           | every pending migration in ONE  |
  | transaction                     |           | transaction (transaction: 'all')|
  +---------------------------------+           +---------------------------------+
                                                       |  mirrored by hand
                                                       v
                                                packages/database/src/indexer/schema.ts
                                                (types queries; drizzle-kit never runs here)
```

## One transaction per release

drizzle-orm's `migrate()` and the Subsquid runner both wrap everything pending in one transaction. Neither `--> statement-breakpoint` nor a separate folder commits anything in between.

- An enum value added by `ADD VALUE` can't be used by any migration in the same release, because Postgres refuses a new value until the transaction that added it commits. Ship the value a release earlier, or apply the `ALTER TYPE` by hand before the migrations run.
- A failing statement rolls back every pending migration. `migrate.ts` then exits with an error and the web server doesn't start.
- A lock on a hot table (`user`, `session`, `cosmo_account`) is held until the whole release commits, which stalls the running app's queries on that table. `ALTER TABLE`, index builds, adding a foreign key to the table (`SHARE ROW EXCLUSIVE`) and dropping one (`ACCESS EXCLUSIVE`) all take such a lock.
- Rehearse a release's migrate time on a restored copy of the database before shipping one of those.
- `CONCURRENTLY` can't run inside a transaction, and a large backfill holds its locks for the whole run. Run such DDL by hand first (autocommit, processor stopped if needed), then ship the idempotent migration, which applies as a no-op. The header of `apps/indexer/db/migrations/1792234623962-Data.js` is the example.

## Web DB

1. Edit `packages/database/src/web/schema.ts`. Better Auth tables have their own procedure under "Schema generation" in [docs/auth.md](auth.md).
2. From `apps/web`, run `bun run env -- drizzle-kit generate --name <name>`. Plain `db:generate` (and `db:push`) don't load the root `.env`, and `drizzle.config.ts` throws without `DATABASE_URL_UNPOOLED`.
3. Read the generated `migration.sql` for hot-table locks, enum values used in the same release, and data loss.
4. Add any backfill `UPDATE`s to the generated `migration.sql` before committing it.
5. Run `bun run db:check`, then `bun run db:migrate` to apply it locally.

- `bun run db:generate --custom --name <name>` scaffolds an empty migration for SQL drizzle-kit can't generate, such as a duplicate check ahead of a new unique index. Folders apply in timestamp order, so scaffold it before the schema edit it must precede.
- Never edit or delete a committed `drizzle/<ts>_<name>/` folder. drizzle-kit rebuilds the schema by replaying the `snapshot.json` chain, and the migrator matches applied migrations by folder name, so an edit never reaches a database that already ran it.
- Run `generate` and `check` non-interactively with `--output json`. When `generate` needs a decision (a rename or a destructive change), it returns a `missing_hints` envelope instead of prompting: answer with `--hints '[...]'` or `--hints-file <path>` and run it again.
- `db:push` syncs the schema to a local database without writing files, for local experiments only.
- `db:upgrade` converts snapshots from an older drizzle-kit, which `generate` and `check` refuse until it runs.

### Dropping a web column

Remove the column from the TS schema one release before the migration that drops it, because Drizzle selects every declared column and the app keeps serving while the migration runs.

## Indexer DB

The procedure (models, migration, Drizzle mirror, `schema.graphql`) and the generator commands never to run are under "Schema changes" in [apps/indexer/CLAUDE.md](../apps/indexer/CLAUDE.md).

- `squid-typeorm-migration apply` is safe: the processor's start script runs it, which is also how a fresh local indexer database gets its schema.
- Add check constraints on big tables as `NOT VALID`, which holds for new rows without scanning old ones (`1791627703101-Data.js`).
- The Drizzle mirror only types queries. Its index list is incomplete and some column types differ from the DDL (`uuid()` where the table has `varchar(36)`), so read the migrations for the real DDL.
- A column that reaches the UI also follows "Where to start" in [docs/database.md](database.md).

## Order for outbox changes

A change to `list_event_outbox` ships the processor first, whose start runs the indexer migration, and apps/schedules last, after the web migrations too, because the drain reads the columns the others add.

## Hand-applied settings

The indexer database has per-table autovacuum settings, because constant owner rewrites otherwise leave the visibility map stale.

| Table                  | Settings come from                     |
| ---------------------- | -------------------------------------- |
| `objekt`               | applied by hand (below)                |
| `transfer`             | applied by hand (below)                |
| `collection`           | applied by hand (below)                |
| `list_event_outbox`    | applied by hand (below)                |
| `collection_owner`     | applied by hand (below)                |
| `collection_stats`     | its migration, `1791327933173-Data.js` |
| `progress_leaderboard` | its migration, `1792234623962-Data.js` |

Re-apply the hand-applied settings after any from-scratch rebuild of the live indexer database, and update this block when they change:

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
```
