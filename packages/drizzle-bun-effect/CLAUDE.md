# @apollo/drizzle-bun-effect

A vendored drizzle-orm Effect driver backed by Bun's native `SQL` client. It exists because drizzle 1.0 only ships Effect flavors for `@effect/sql-pg` (effect-postgres), mysql2, and sqlite-bun — there is no bun-sql flavor — and Effect declined to ship an `@effect/sql-pg-bun` package (Effect-TS/effect#5230, closed stale). It lets the repo run a single Postgres driver stack (Bun SQL) across the web app and the Effect services instead of carrying `pg`/`@effect/sql-pg` alongside it.

**Status: adopted.** The DB services in `apps/schedules` and `apps/typesense-import` run on this driver; `@effect/sql-pg` is out of the workspace entirely.

## API

`make({ client, relations, codecs?, jit?, logger?, cache? })` returns `Effect<BunSQLEffectDatabase<TRelations> & { $client: SQL }>`. Unlike effect-postgres's `make`, it requires no services: the Bun `SQL` client is passed in directly, and logger/cache default to drizzle's no-op implementations (`EffectLogger.make` / `EffectCache.make`). Codecs default to drizzle's own `bunSqlPgCodecs` — the same decoding the web app's promise driver (`drizzle-orm/bun-sql`) uses, so timestamptz/bigint modes match.

Error surface matches effect-postgres exactly: queries fail with `EffectDrizzleQueryError` (carrying query text + params; the underlying failure is a `SqlError` in its cause), transactions add `SqlError` to the error channel, and `tx.rollback()` fails with `EffectTransactionRollbackError`. `src/sql-error.ts` classifies Bun `SQL.PostgresError` values into the same `SqlErrorReason` taxonomy `@effect/sql-pg` uses (SQLSTATE from `PostgresError.errno`, Bun `ERR_POSTGRES_*` codes for client-side failures).

Transactions reserve a dedicated connection (`sql.reserve()`) and run explicit `begin`/`commit`/`rollback`: commit only on success, rollback on failure and interruption (the user effect runs inside `Effect.uninterruptibleMask` + `restore`), and the reserved connection is released via `Effect.ensuring` — unless the rollback itself failed, in which case the connection is destroyed (`close`) instead of pooled, since it may be stuck inside an aborted transaction. Nested transactions use `savepoint spN` / `release savepoint` / `rollback to savepoint` on the same reserved connection and are serialized by a per-transaction semaphore (mirroring `@effect/sql`'s `makeWithTransaction`) so concurrent sibling savepoints cannot interleave.

Known divergences from effect-postgres (all deliberate, found in adversarial review): a failed COMMIT surfaces as a typed `SqlError` rather than upstream's defect; client-side connection/auth failures classify as `ConnectionError`/`AuthenticationError` where `@effect/sql-pg` yields `UnknownError` (ours is more informative — server-error SQLSTATE mapping is identical); and `db.execute` (raw mode) returns Bun's rows array, which matches the *declared* type, where effect-postgres actually returns pg's `Result` object at runtime despite declaring an array — code poking `.rows`/`.rowCount` off raw results behaves differently.

## Maintenance surface

The driver reaches into drizzle internals that are exported (`exports: "./*"`) but not part of the documented API. On any drizzle-orm bump — and definitely at drizzle 1.0 stable — re-verify these against `drizzle-orm/effect-postgres/{driver,session}.js`:

- `drizzle-orm/pg-core/effect` — `PgEffectDatabase`, `PgEffectSession`, `PgEffectPreparedQuery` (the injected-executor contract), `PgEffectTransaction`, `EffectDrizzlePgConfig`
- `drizzle-orm/effect-core` — `EffectLogger`, `EffectLoggerShape`, `QueryEffectHKTBase`, `EffectDrizzleQueryError`
- `drizzle-orm/cache/core/cache-effect` — `EffectCache`, `EffectCacheShape`
- `drizzle-orm/cache/core/types` — `WithCacheConfig`
- `drizzle-orm/bun-sql/postgres/codecs` — `bunSqlPgCodecs`
- `effect/unstable/sql/SqlError` — `SqlError` and the reason classes (also used by drizzle's own effect-postgres types)

Two upstream internals are reimplemented rather than imported because they're stripped from the public types: `PgEffectTransaction.getTransactionConfigStatements` (rebuilt as `transactionConfigStatements` in `src/session.ts`) and `jitCompatCheck` (reduced to `config.jit === true`; Bun always supports the `Function` constructor it probes for). If upstream changes transaction-config SQL generation, update the copy.

## Validation record

Before the initial commit (2026-08-17) the driver was validated against live local databases with a throwaway comparison harness: identical probes ran through `drizzle-orm/effect-postgres` (pg-backed) and this driver against both the web and indexer databases, diffing decoded results — RQB rows, bigint columns (value and typeof), `$count`, date/real columns, transaction insert+rollback, unique-violation error classification (SQLSTATE 23505 → `UniqueViolation`), and savepoint nesting. All probes were byte-identical, including a re-run with the pool at `max: 4` proving in-transaction statements route through the reserved connection (`max: 1` masks that bug class). Writes only ever happened inside transactions that rolled back.

When bumping drizzle-orm (and definitely at 1.0 stable), rebuild an equivalent comparison: construct both drivers over the same live databases, run the probe set above, and diff with a bigint-aware serializer. The transaction-routing check with `max > 1` is the one that static review cannot replace.
