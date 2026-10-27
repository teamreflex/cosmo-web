# @apollo/drizzle-bun-effect

A drizzle-orm Effect driver backed by Bun's native `SQL` client. drizzle 1.0 ships Effect drivers only for `@effect/sql-pg` (node-postgres), mysql2 and sqlite-bun, and Effect declined an `sql-pg-bun` package ([Effect-TS/effect#5230](https://github.com/Effect-TS/effect/issues/5230)). This driver lets the Effect apps use the same Postgres driver as the web app: Bun SQL.

`@apollo/services` builds the web DB service on it, and `apps/schedules` its indexer DB service. Its error surface, transaction behaviour and the drizzle internals it depends on are in [`CLAUDE.md`](CLAUDE.md).

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
