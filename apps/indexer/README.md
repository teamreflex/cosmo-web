# indexer

A [Subsquid](https://docs.sqd.ai/sdk/overview/) processor that follows MODHAUS' contracts on the Abstract chain and writes the indexer Postgres database. Nothing else writes chain data, so this database is the source of truth for who owns which objekt.

## What it writes

| Contract         | Becomes                                                           |
| ---------------- | ----------------------------------------------------------------- |
| objekt (ERC-721) | collections, objekts and their owners, transfers, transferability |
| COMO (ERC-1155)  | COMO balances per owner and COMO token                            |
| gravity          | votes, and the candidate of each vote once the poll is revealed   |

Along the way it fetches COSMO metadata for every transfer, mirrors collection images into R2, estimates the serials of objekts minted after COSMO stopped publishing them, and appends `list_event_outbox` rows for every transfer and transferability change. Triggers keep collection stats and the progress leaderboard current.

## Who reads it

- apps/web reads it through Drizzle for objekts, collections, COMO, gravity and serials, and staff edit collections and serial confirmations through `/admin`.
- apps/schedules drains the outbox into the web database, recomputes serials, and syncs `member` and `collection_market_stats`.
- apps/typesense-import imports new collections into Typesense.

## Running locally

A fresh indexer database gets its tables when the processor starts, because `bun run start` applies `db/migrations` before processing.

1. In `.env`, set `DEV_PROCESSOR=true` and the `INDEXER_*` variables (`INDEXER_ENABLE_OBJEKTS` and `INDEXER_ENABLE_GRAVITY` are `false` in `.env.example`).
2. Start the services with `bun run services` or `turbo dev --filter web` (see [`docs/tooling.md`](../../docs/tooling.md)). The `processor` compose service builds `apps/indexer/Dockerfile` and runs against `postgres-indexer` and the local S3 proxy.

To exercise the outbox drain without a chain, leave the processor off and use `bun run simulate` in apps/schedules (see [its CLAUDE.md](../schedules/CLAUDE.md)).

A database built this way holds only Abstract-era data, from April 2025 on. Polygon-era rows exist only in the live database.

## More

- [CLAUDE.md](CLAUDE.md): how a batch runs, error handling, rollbacks, schema changes.
- [`docs/cosmo.md`](../../docs/cosmo.md): collections, objekts, serials, COMO and gravity.
- `schema.graphql` describes the entities for anyone using GraphQL tooling; the TypeORM models in `src/model/generated` are what the processor runs.
