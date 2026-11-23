import { relations } from "@apollo/database/indexer/relations";
import { DrizzlePostgresClient } from "drizzle-orm/postgres/client/effect/node";
import { makeWithDefaults } from "drizzle-orm/postgres/effect";
import { Config, Context, Layer } from "effect";

export class DatabaseIndexer extends Context.Service<DatabaseIndexer>()(
  "app/Database/Indexer",
  { make: makeWithDefaults({ relations }) },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(
      DrizzlePostgresClient.layerConfig({
        url: Config.Redacted("INDEXER_DATABASE_URL"),
        applicationName: Config.succeed("Schedules"),
        // only need 1 connection for single-threaded app
        maxConnections: Config.succeed(1),
      }),
    ),
  );
}
