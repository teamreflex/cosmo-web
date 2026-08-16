import { relations } from "@apollo/database/web/relations";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { Context, Effect, Layer, Redacted } from "effect";
import { Env } from "../config";

export class Metadata extends Context.Service<Metadata>()("app/Metadata", {
  make: Effect.gen(function* () {
    const env = yield* Env;

    // set application name for pg_stat_activity visibility
    const url = new URL(Redacted.value(env.WEB_DATABASE_URL));
    url.searchParams.set("application_name", "Importer");

    const client = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new SQL({
            url: url.toString(),
            max: 1, // only need 1 connection for single-threaded app
          }),
      ),
      (client) => Effect.promise(() => client.end({ timeout: 5 })),
    );
    return drizzle({ client, relations });
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Env.layer),
  );
}
