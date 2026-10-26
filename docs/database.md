# Databases

Apollo runs two separate Postgres databases, so no query joins them and no transaction spans them.

## The two databases

|                | Indexer DB                                                                                                                                         | Web DB                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Holds          | chain data (collections, objekts, transfers, votes, COMO balances), `list_event_outbox`, and tables derived from them (stats, owners, leaderboard) | users and everything they create: accounts, COSMO links, lists, binders, trades, reports, … |
| DDL lives in   | apps/indexer: `schema.graphql`, the TypeORM models and the hand-written `db/migrations/*.js`                                                       | `packages/database/src/web/schema.ts` and `src/auth.ts`                                     |
| Drizzle schema | `packages/database/src/indexer/schema.ts`, a hand-kept mirror that only types queries                                                              | `packages/database/src/web/schema.ts`                                                       |
| Migrations     | [docs/migrations.md](migrations.md)                                                                                                                | [docs/migrations.md](migrations.md)                                                         |

What each `@apollo/database` subpath exports: [packages/database/README.md](../packages/database/README.md). The trade tables: [docs/trades/data-model.md](trades/data-model.md).

## How apps connect

| App                                   | Web DB client                                              | Indexer DB client                                                 | Pool               |
| ------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| apps/web                              | `db` in `@/lib/server/db` (`DATABASE_URL`)                 | `indexer` in `@/lib/server/db/indexer` (`INDEXER_DATABASE_URL`)   | 15 web, 25 indexer |
| apps/web drizzle-kit and `migrate.ts` | `DATABASE_URL_UNPOOLED`                                    | -                                                                 | 1                  |
| apps/schedules                        | `DatabaseWeb` from `@apollo/services` (`WEB_DATABASE_URL`) | `DatabaseIndexer` in `src/db-indexer.ts` (`INDEXER_DATABASE_URL`) | 1 each             |
| apps/chat                             | `DatabaseWeb`                                              | -                                                                 | 10                 |
| apps/typesense-import                 | `Metadata` in `src/db/metadata.ts` (`WEB_DATABASE_URL`)    | `Indexer` in `src/db/indexer.ts` (`INDEXER_DATABASE_URL`)         | 1 each             |
| apps/indexer                          | -                                                          | TypeORM store (`DB_URL`)                                          |                    |

- apps/web uses the promise driver `drizzle-orm/bun-sql`. The Effect apps use [`@apollo/drizzle-bun-effect`](../packages/drizzle-bun-effect/README.md).
- Every client sets `application_name` on its URL, so its connections are named in `pg_stat_activity`.
- A one-connection client can't query through the pool inside its own transaction; the rule is in the Effect conventions of [docs/tooling.md](tooling.md).
- Locally the pooled URLs go through pgbouncer in transaction mode and the unpooled one straight to Postgres ([docs/tooling.md](tooling.md) lists the ports). Bun SQL prepares every statement, and pgbouncer's `MAX_PREPARED_STATEMENTS` is what lets that work under transaction pooling.

## Who writes what

| Writer                                                     | Indexer DB                                                                                                                    | Web DB                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| apps/indexer processor                                     | chain tables and `serial_reservation`; appends to `list_event_outbox`                                                         | -                                                                              |
| triggers on `objekt`, `collection`, `progress_leaderboard` | `collection_stats`, `collection_owner`, `progress_leaderboard`, `progress_histogram`                                          | -                                                                              |
| apps/web                                                   | collection fields (staff edits, share-data media), `serial_confirmation`                                                      | everything                                                                     |
| apps/schedules                                             | `member`, `collection_market_stats`, `objekt.serial`, purge of drained outbox rows                                            | the outbox drain, trade timers, notifications, price and FX stats, gravities   |
| apps/chat                                                  | -                                                                                                                             | `trade_messages`, `report_messages`, `reports`, `notifications`, `staff_audit` |
| scripts, run by hand                                       | `packages/image/scripts/mirror.ts`, `packages/serial-estimation/scripts/*`, `apps/schedules/scripts/simulate.ts` (local only) | -                                                                              |

- apps/typesense-import only reads.
- The processor never writes the trigger-kept tables. Reindexing around the triggers is in [apps/indexer/CLAUDE.md](../apps/indexer/CLAUDE.md).
- Who writes serials, and when: [docs/cosmo.md](cosmo.md).

## Crossing the databases

- A web server function that touches both reads the indexer first, then opens the web transaction and routes every web call through `tx`. A web transaction held open across an indexer round trip only holds its locks longer.
- `drain-outbox` is the exception: it locks `list_drain_cursor` inside its web transaction and then reads the outbox past it, because the cursor lock is what makes each batch apply exactly once ([apps/schedules/CLAUDE.md](../apps/schedules/CLAUDE.md)).
- Trade rows copy the indexer's collection values (`slug`, `artist`, `member`, `season`, `class`, `on_offline`), so the trade feed filters without crossing databases.
- `member` and `collection_market_stats` live in the indexer DB although apps/schedules writes them, so the web app's member and market sorts join them to `collection` in one query.

## Identifiers across the databases

The same idea has different names and types in each database, and using the wrong one matches nothing, with no error.

| Concept         | Indexer DB                                                                                                                                    | Web DB                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Collection key  | `collection.id`, a uuid string, which every `collection_id` column holds except `list_event_outbox`'s                                         | `collection_id` columns hold the slug (`objekt_list_entries`, `collection_data`, `notifications`, `collection_price_stats`, `collection_price_history`); trade tables call it `slug` |
| Collection name | `collection.collection_id` is `"<Season> <Member> <CollectionNo>"`; `collection.slug` is `slugifyObjekt(collection_id)`                       | -                                                                                                                                                                                    |
| Objekt token id | text in `objekt.id`, `list_event_outbox.token_id` and `serial_confirmation.token_id`; integer in `transfer.token_id` and `serial_reservation` | integer everywhere (`pins`, `binder_entries`, `locked_objekts`, `trade_offer_items`, `notifications`) except text in `objekt_list_entries.token_id`                                  |
| Address         | lowercase `varchar`, lowercased with `addr()` on write                                                                                        | `citext`: compares case-insensitively, but keeps the case it was stored with                                                                                                         |

- `list_event_outbox.collection_id` holds the slug, so the drain can match it against `objekt_list_entries.collection_id` directly.
- Convert token ids at the boundary: `String(tokenId)` into an indexer query, `Number(row.id)` out of one (`readIndexerTokens()` in `apps/web/src/lib/server/trades/holdings.server.ts`).
- Trade inputs cap token ids at 2^31 - 1 (`tokenIdSchema` in `packages/trades/src/listing.ts`), the integer columns' limit.
- Compare a web address with an indexer address through `addr()` or `isEqual()` from `@apollo/util`, because `===` fails on case.
- `vote.token_id` and `como_balance.token_id` are gravity and COMO token ids, unrelated to objekt ids.
- `collection.slug` and `collection.collection_id` never change, because web rows, the processor's upsert and the R2 media keys all look collections up by them. Collection edit handlers (`$updateCollection`) write only the editable fields.

## Where types and shared SQL go

- `@apollo/database/web/types` holds what follows from the schema: inferred row types, the `as const` lists that enums and `$type<>()` columns are built from, the jsonb payload unions (`TradeEvent`, `StaffAuditDetail`), and `NewNotification`, the insert shape `notifications_subject_chk` allows.
- Types shaped for the app (projections, joined rows, UI types) go in `apps/web/src/lib/universal/`.
- `@apollo/database/web/sql` holds SQL fragments that apps/web and apps/schedules must compute identically: `bumpUpdatedAt` and `listingPoolState` ([docs/trades/data-model.md](trades/data-model.md)).

## Querying

The repo runs Drizzle 1.0 with the relational query builder v2. For the full operator list, use the Drizzle llms.txt in [docs/libraries.md](libraries.md).

- Read with `db.query.<table>.findMany()` / `findFirst()` and their `where`, `with` and `columns`.
- Relational `where` takes the object syntax (`{ col: value }`, `{ col: { gte, in, ilike } }`, `AND`/`OR`/`NOT`, `RAW`). `eq()`, `and()` and the other builder functions belong to `db.select()`, and relational `where` rejects them.
- An explicit `undefined` anywhere in `where` throws at runtime, and the types don't catch it. `in: []` matches nothing. Write optional filters with `EmptyFilter` from `drizzle-orm`:

  ```ts
  where: {
    userId: userId ?? EmptyFilter,
    status: statuses.length ? { in: statuses } : EmptyFilter,
    RAW: before ? (t) => sql`${t.id} < ${before}` : EmptyFilter,
  }
  ```

- Prefix search on user input: `ilike: prefixPattern(query)` (`apps/web/src/lib/server/util.server.ts`) escapes `%` and `_`.
- Queries against one database run one after another, never in `Promise.all`, because concurrent queries each take a pooled connection and contend on the same server for little gain. One `db` read and one `indexer` read may run in parallel, as `readTokenStates()` does.
- Use `db.select()` for joins, aggregates and CTEs. Write raw `sql` only where Drizzle has no builder (`array_agg`, `CASE`, `jsonb_to_recordset`).
- Bind arrays with `inArray()` or `arrayOverlaps()`, never by joining values into SQL text.
- A query meant to use a partial index writes the index's predicate as literal SQL, not bound parameters, because a generic plan can't prove the index's `WHERE` from a parameter. `openListing` in `apps/web/src/lib/server/trades/feed.server.ts` is the pattern.
- Postgres returns `count`, `sum` and window functions as `bigint`, which bun:sql hands back as a JS `BigInt`. `JSON.stringify` throws on it, and the `sql<number>` annotation converts nothing. Write ``sql<number>`count(*)::int`.mapWith(Number)`` or use Drizzle's `count()` / `$count()`.
- `mode: "bigint"` columns (`list_event_outbox.id`, `list_drain_cursor.seq`) return a real `BigInt` and must stay out of anything serialized.
- Turn an expected constraint violation into an outcome with `isPostgresError(error, "23505", "<index name>")` (`util.server.ts`), as a claim racing for a token does in `trade.server.ts`.
- Hot indexer queries carry `.comment({ fn: "<function name>" })`, so they're named in the database's query statistics. Other queries don't need one.

## Schema conventions (web DB)

- New timestamp columns use `mode: "date"`, because string mode returns a zoneless string that breaks older Safari. `mode` only affects JS, so changing it needs no migration, but it changes every consumer's type.
- `createdAt` and `createdTimestamp()` from `@apollo/database/custom` make `timestamp` columns without a time zone, holding UTC. Trades, notifications and `list_drain_cursor` use `timestamptz`.
- Raw SQL that reads a zoneless column as an instant converts it with `at time zone 'utc'`, as `sync-market-stats` does.
- CHECK constraints live in the Drizzle schema, never in hand-written SQL, because drizzle-kit only knows what the snapshot holds. Several encode a per-row state machine (`trade_offers_*_chk`, `notifications_subject_chk`, `trade_listing_wants_shape_chk`).
- A check that lists enum values inlines them with `sqlValues()`, because drizzle-kit can't parameterise a check.
- Enum values come from the `as const` lists in `web/types.ts`. Append new values at the end, so the migration is a plain `ADD VALUE`. When the value can be used is in [docs/migrations.md](migrations.md).
- A descending index column needs `.desc().nullsFirst()`. Bare `.desc()` emits `DESC NULLS LAST`, which a plain `ORDER BY col DESC` can't use (`fx_rates_currency_date_idx`).
- `cosmo_account_username_change_trigger` (migration `20250805153212_bizarre_roughhouse`) appends to `cosmo_account_changes` on a username change. drizzle-kit doesn't know it exists.
- How a foreign key to `user.id` behaves on account deletion is in [docs/accounts.md](accounts.md).

## Append-only audit tables

- `staff_audit` and `cosmo_link_audit` are only ever inserted into, and must outlive the accounts they name.
- Their user columns are plain text ids with no foreign key. The relation is declared only in `relations.ts`, and a deleted user reads back as null.
- Order their rows by `id`, because `defaultNow()` is the transaction's start time and every row one transaction writes shares a `created_at`.
- `report_messages` and `user_feedback_stats` also skip the user foreign key, so the evidence and the stats survive deletion.

## Where to start

- New web table or column: edit `web/schema.ts`, add relations to `web/relations.ts` and the row type to `web/types.ts`, then generate the migration ([docs/migrations.md](migrations.md)).
- New enum value: append it to its list in `web/types.ts`.
- New indexer column: the procedure is under "Schema changes" in [apps/indexer/CLAUDE.md](../apps/indexer/CLAUDE.md).
- An indexer column that reaches the UI: declare it on `ObjektBaseFields` and `BFFCollectionGroupCollection` (`packages/cosmo/src/types/objekts.ts`) instead of defaulting it in the converters. That is enough because `mapLegacyObjekt()` spreads indexer rows into a `CosmoObjekt`, and `IndexedObjekt` is the inferred indexer `Collection`.
- A query that crosses databases: read the indexer first, convert token ids and slugs at the boundary, then open the web transaction.
