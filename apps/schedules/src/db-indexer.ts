import { relations } from "@apollo/database/indexer/relations";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { Effect, Redacted } from "effect";
import { Env } from "./env";

export class DatabaseIndexer extends Effect.Service<DatabaseIndexer>()(
  "app/Database/Indexer",
  {
    effect: Effect.gen(function* () {
      const env = yield* Env;

      // set application name for pg_stat_activity visibility
      const url = new URL(Redacted.value(env.indexerDatabaseUrl));
      url.searchParams.set("application_name", "Schedules");

      const client = new SQL({
        url: url.toString(),
        max: 1, // only need 1 connection for single-threaded app
      });
      return drizzle({ client, relations });
    }),
    dependencies: [Env.Default],
  },
) {}
