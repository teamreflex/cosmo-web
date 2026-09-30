import { relations } from "@apollo/database/indexer/relations";
import { make } from "@apollo/drizzle-bun-effect";
import { SQL } from "bun";
import { Config, Context, Effect, Layer, Redacted } from "effect";

export class DatabaseIndexer extends Context.Service<DatabaseIndexer>()(
  "app/Database/Indexer",
  {
    make: Effect.gen(function* () {
      const databaseUrl = yield* Config.Redacted("INDEXER_DATABASE_URL");

      // set application name for pg_stat_activity visibility
      const url = new URL(Redacted.value(databaseUrl));
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
  static readonly layer = Layer.effect(this, this.make);
}
