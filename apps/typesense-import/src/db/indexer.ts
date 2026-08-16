import { relations } from "@apollo/database/indexer/relations";
import { PgClient } from "@effect/sql-pg";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { Env } from "../config";

export class Indexer extends Context.Service<Indexer>()("app/Indexer", {
  make: makeWithDefaults({ relations }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(
      // scoped pg pool: the layer finalizer closes the connection on shutdown
      Layer.unwrap(
        Effect.gen(function* () {
          const env = yield* Env;
          return PgClient.layer({
            url: env.INDEXER_DATABASE_URL,
            maxConnections: 1, // only need 1 connection for single-threaded app
            // set application name for pg_stat_activity visibility
            applicationName: "Importer",
          });
        }),
      ),
    ),
    Layer.provide(Env.layer),
  );
}
