import { relations } from "@apollo/database/web/relations";
import { make } from "@apollo/drizzle-bun-effect";
import { SQL } from "bun";
import { Config, Context, Effect, Layer, Redacted } from "effect";

interface DatabaseWebOptions {
  applicationName: string;
  max: number;
}

export class DatabaseWeb extends Context.Service<DatabaseWeb>()(
  "apollo/Database/Web",
  {
    make: (options: DatabaseWebOptions) =>
      Effect.gen(function* () {
        const databaseUrl = yield* Config.Redacted("WEB_DATABASE_URL");

        // set application name for pg_stat_activity visibility
        const url = new URL(Redacted.value(databaseUrl));
        url.searchParams.set("application_name", options.applicationName);

        // scoped client: the layer finalizer closes the connection on shutdown
        const client = yield* Effect.acquireRelease(
          Effect.sync(() => new SQL({ url: url.toString(), max: options.max })),
          (client) => Effect.promise(() => client.end({ timeout: 5 })),
        );
        return yield* make({ client, relations });
      }),
  },
) {
  /**
   * Each call builds a new layer, and layers memoize by reference, so an app
   * declares its layer once and reuses that value everywhere.
   */
  static readonly layer = (options: DatabaseWebOptions) =>
    Layer.effect(this, this.make(options));
}

export type WebTx = Parameters<
  Parameters<typeof DatabaseWeb.Service.transaction>[0]
>[0];
