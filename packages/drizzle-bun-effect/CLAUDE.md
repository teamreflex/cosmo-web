# @apollo/drizzle-bun-effect

A vendored drizzle-orm Effect driver backed by Bun's native `SQL` client. It exists because drizzle 1.0 only ships Effect flavors for `@effect/sql-pg` (effect-postgres), mysql2, and sqlite-bun — there is no bun-sql flavor — and Effect declined to ship an `@effect/sql-pg-bun` package (Effect-TS/effect#5230, closed stale). It lets the repo run a single Postgres driver stack (Bun SQL) across the web app and the Effect services instead of carrying `pg`/`@effect/sql-pg` alongside it.

## API

`make({ client, relations, codecs?, jit?, logger?, cache? })` returns `Effect<BunSQLEffectDatabase<TRelations> & { $client: SQL }>`. Unlike effect-postgres's `make`, it requires no services: the Bun `SQL` client is passed in directly, and logger/cache default to drizzle's no-op implementations (`EffectLogger.make` / `EffectCache.make`). Codecs default to drizzle's own `bunSqlPgCodecs` — the same decoding the web app's promise driver (`drizzle-orm/bun-sql`) uses, so timestamptz/bigint modes match.

Error surface matches effect-postgres exactly: queries fail with `EffectDrizzleQueryError` (carrying query text + params; the underlying failure is a `SqlError` in its cause), transactions add `SqlError` to the error channel, and `tx.rollback()` fails with `EffectTransactionRollbackError`. `src/sql-error.ts` classifies Bun `SQL.PostgresError` values into the same `SqlErrorReason` taxonomy `@effect/sql-pg` uses (SQLSTATE from `PostgresError.errno`, Bun `ERR_POSTGRES_*` codes for client-side failures).

Transactions reserve a dedicated connection (`sql.reserve()`) and run explicit `begin`/`commit`/`rollback`: commit only on success, rollback on failure and interruption (the user effect runs inside `Effect.uninterruptibleMask` + `restore`), and the reserved connection is released via `Effect.ensuring` — unless the rollback itself failed, in which case the connection is destroyed (`close`) instead of pooled, since it may be stuck inside an aborted transaction. Nested transactions use `savepoint spN` / `release savepoint` / `rollback to savepoint` on the same reserved connection and are serialized by a per-transaction semaphore (mirroring `@effect/sql`'s `makeWithTransaction`) so concurrent sibling savepoints cannot interleave.

Known divergences from effect-postgres (all deliberate, found in adversarial review): a failed COMMIT surfaces as a typed `SqlError` rather than upstream's defect; client-side connection/auth failures classify as `ConnectionError`/`AuthenticationError` where `@effect/sql-pg` yields `UnknownError` (ours is more informative — server-error SQLSTATE mapping is identical); and `db.execute` (raw mode) returns Bun's rows array, which matches the _declared_ type, where effect-postgres actually returns pg's `Result` object at runtime despite declaring an array — code poking `.rows`/`.rowCount` off raw results behaves differently.

## Maintenance surface

The driver reaches into drizzle internals that are exported (`exports: "./*"`) but not part of the documented API. On any drizzle-orm bump — and definitely at drizzle 1.0 stable — re-verify these against `drizzle-orm/effect-postgres/{driver,session}.js`:

- `drizzle-orm/pg-core/effect` — `PgEffectDatabase`, `PgEffectSession`, `PgEffectPreparedQuery` (the injected-executor contract), `PgEffectTransaction`, `EffectDrizzlePgConfig`
- `drizzle-orm/effect-core` — `EffectLogger`, `EffectLoggerShape`, `QueryEffectHKTBase`, `EffectDrizzleQueryError`
- `drizzle-orm/cache/core/cache-effect` — `EffectCache`, `EffectCacheShape`
- `drizzle-orm/cache/core/types` — `WithCacheConfig`
- `drizzle-orm/bun-sql/postgres/codecs` — `bunSqlPgCodecs`
- `effect/unstable/sql/SqlError` — `SqlError` and the reason classes (also used by drizzle's own effect-postgres types)

Two upstream internals are reimplemented rather than imported because they're stripped from the public types: `PgEffectTransaction.getTransactionConfigStatements` (rebuilt as `transactionConfigStatements` in `src/session.ts`) and `jitCompatCheck` (reduced to `config.jit === true`; Bun always supports the `Function` constructor it probes for). If upstream changes transaction-config SQL generation, update the copy.
