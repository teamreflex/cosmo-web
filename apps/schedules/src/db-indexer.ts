import { relations } from "@apollo/database/indexer/relations";
import { PgClient } from "@effect/sql-pg";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { Env } from "./env";

export class DatabaseIndexer extends Context.Service<DatabaseIndexer>()(
  "app/Database/Indexer",
  {
    make: makeWithDefaults({ relations }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(
      // scoped pg pool: the layer finalizer closes the connection on shutdown
      Layer.unwrap(
        Effect.gen(function* () {
          const env = yield* Env;
          return PgClient.layer({
            url: env.indexerDatabaseUrl,
            maxConnections: 1, // only need 1 connection for single-threaded app
            // set application name for pg_stat_activity visibility
            applicationName: "Schedules",
          });
        }),
      ),
    ),
    Layer.provide(Env.layer),
  );
}
