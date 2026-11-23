import { relations } from "@apollo/database/web/relations";
import { DrizzlePostgresClient } from "drizzle-orm/postgres/client/effect/node";
import { makeWithDefaults } from "drizzle-orm/postgres/effect";
import { Config, Context, Layer } from "effect";

interface DatabaseWebOptions {
  applicationName: string;
  max: number;
}

export class DatabaseWeb extends Context.Service<DatabaseWeb>()(
  "apollo/Database/Web",
  { make: makeWithDefaults({ relations }) },
) {
  /**
   * Each call builds a new layer with its own pool, and layers memoize by
   * reference, so an app declares its layer once and reuses that value
   * everywhere. The pool closes with the layer's scope.
   */
  static readonly layer = (options: DatabaseWebOptions) =>
    Layer.effect(this, this.make).pipe(
      Layer.provide(
        DrizzlePostgresClient.layerConfig({
          url: Config.Redacted("WEB_DATABASE_URL"),
          applicationName: Config.succeed(options.applicationName),
          maxConnections: Config.succeed(options.max),
        }),
      ),
    );
}

export type WebTx = Parameters<
  Parameters<typeof DatabaseWeb.Service.transaction>[0]
>[0];
