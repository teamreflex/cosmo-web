import { relations } from "@apollo/database/indexer/relations";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { Effect, Redacted } from "effect";
import { Env } from "../config";

export class Indexer extends Effect.Service<Indexer>()("app/Indexer", {
  scoped: Effect.gen(function* () {
    const env = yield* Env;

    // set application name for pg_stat_activity visibility
    const url = new URL(Redacted.value(env.INDEXER_DATABASE_URL));
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
  dependencies: [Env.Default],
}) {}
