# @apollo/drizzle-bun-effect

A drizzle-orm Effect driver backed by Bun's native `SQL` client. drizzle 1.0 only ships Effect flavors for `@effect/sql-pg` (node-postgres), mysql2, and sqlite-bun, and Effect declined an `sql-pg-bun` package ([Effect-TS/effect#5230](https://github.com/Effect-TS/effect/issues/5230)) — this fills the gap so the Effect apps can share the same Postgres driver stack (Bun SQL) as the rest of the monorepo.

## Usage

```ts
import { make } from "@apollo/drizzle-bun-effect";
import { relations } from "@apollo/database/indexer/relations";
import { SQL } from "bun";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const client = new SQL({ url: process.env.DATABASE_URL, max: 1 });
  const db = yield* make({ client, relations });

  const rows = yield* db.query.collections.findMany({ limit: 5 });

  yield* db.transaction((tx) =>
    Effect.gen(function* () {
      yield* tx.insert(someTable).values({ ... });
      // tx.rollback() aborts with EffectTransactionRollbackError
    }),
  );
});
```

Queries fail with `EffectDrizzleQueryError` (query text + params, `SqlError` cause), transactions add `SqlError` — the same error surface as `drizzle-orm/effect-postgres`, so the two drivers are drop-in interchangeable at call sites. Transactions run on a reserved connection with explicit begin/commit/rollback, roll back on failure and interruption, and serialize nested savepoints.
