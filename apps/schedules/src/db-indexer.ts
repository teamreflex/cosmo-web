import { relations } from "@apollo/database/indexer/relations";
import { make } from "@apollo/drizzle-bun-effect";
import { SQL } from "bun";
import { Context, Effect, Layer, Redacted } from "effect";
import { Env } from "./env";

export class DatabaseIndexer extends Context.Service<DatabaseIndexer>()(
  "app/Database/Indexer",
  {
    make: Effect.gen(function* () {
      const env = yield* Env;

      // set application name for pg_stat_activity visibility
      const url = new URL(Redacted.value(env.indexerDatabaseUrl));
      url.searchParams.set("application_name", "Schedules");

      // scoped client: the layer finalizer closes the connection on shutdown
      const client = yield* Effect.acquireRelease(
        Effect.sync(
          () => new SQL({ url: url.toString(), max: 1 }), // only need 1 connection for single-threaded app
        ),
        (client) => Effect.promise(() => client.end({ timeout: 5 })),
      );
      return yield* make({ client, relations });
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Env.layer),
  );
}
