# @apollo/drizzle-bun-effect

A vendored drizzle-orm Effect driver on Bun's native `SQL` client, modelled on `drizzle-orm/effect-postgres`. `README.md` says why it exists and shows usage.

## API

- `make()` needs no services: the Bun `SQL` client is passed in, and the logger and cache default to drizzle's no-op `EffectLogger.make` and `EffectCache.make`.
- Codecs default to drizzle's `bunSqlPgCodecs`, the decoding the web app's promise driver (`drizzle-orm/bun-sql`) uses, so timestamp and bigint values come back the same in every app.

## Errors

- A query fails with `EffectDrizzleQueryError`, which carries the query text (and its params when `paramsInErrors` is set) and has a `SqlError` in its cause.
- A transaction adds `SqlError` to the error channel, and `tx.rollback()` fails with `EffectTransactionRollbackError`.
- `classifyPgError()` (`src/sql-error.ts`) maps Bun `SQL.PostgresError` values onto `@effect/sql-pg`'s `SqlErrorReason` classes: the SQLSTATE from `errno` for server errors, the Bun `ERR_POSTGRES_*` code for client-side failures.

## Transactions

- A top-level transaction reserves a whole pooled connection (`reserve()`) and runs explicit `begin`, `commit` and `rollback`.
- While it is open, a query through `db` instead of `tx` needs a second connection, so on a pool of one it waits forever ([`apps/schedules/CLAUDE.md`](../../apps/schedules/CLAUDE.md) has the consequences).
- It commits only on success and rolls back on failure and on interruption.
- If the rollback itself fails, the connection is closed instead of returned to the pool, because it may be stuck inside an aborted transaction.
- Nested transactions are savepoints on the same connection, serialized by a per-transaction semaphore so sibling savepoints can't interleave.
- An interrupted query is cancelled, and the cancel's rejection is swallowed, because an unhandled rejection makes Bun exit.

## Divergences from effect-postgres

All three are deliberate.

- A failed `COMMIT` is a typed `SqlError`, where upstream dies with a defect.
- Client-side connection and auth failures classify as `ConnectionError` and `AuthenticationError`, where `@effect/sql-pg` gives `UnknownError`. Server SQLSTATE mapping is identical.
- `db.execute` returns Bun's rows array, matching the declared type. effect-postgres returns pg's `Result` object at runtime, so code reading `.rows` or `.rowCount` behaves differently.

## Maintenance surface

The driver imports drizzle internals that are exported (`exports: "./*"`) but not documented. On every drizzle-orm bump, re-check them against `drizzle-orm/effect-postgres/{driver,session}.js`:

- `drizzle-orm/pg-core/effect`: `PgEffectDatabase`, `PgEffectSession`, `PgEffectPreparedQuery` (the injected-executor contract), `PgEffectTransaction`, `EffectDrizzlePgConfig`
- `drizzle-orm/effect-core`: `EffectLogger`, `EffectLoggerShape`, `QueryEffectHKTBase`, `EffectDrizzleQueryError`
- `drizzle-orm/cache/core/cache-effect`: `EffectCache`, `EffectCacheShape`
- `drizzle-orm/cache/core/types`: `QueryMetadata`, `WithCacheConfig`
- `drizzle-orm/bun-sql/postgres/codecs`: `bunSqlPgCodecs`
- `effect/sql/SqlError`: `SqlError` and the reason classes, which drizzle's own effect-postgres types also use

Two upstream internals are stripped from the public types, so they are re-implemented here. Re-check both too:

- `PgEffectTransaction.getTransactionConfigStatements`, copied as `transactionConfigStatements()` in `src/session.ts`. Update the copy if upstream changes how it generates transaction-config SQL.
- `jitCompatCheck`, reduced to `config.jit === true`, because Bun always supports the `Function` constructor it probes for.
