import { relations } from "@apollo/database/web/relations";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { Effect, Redacted } from "effect";
import { Env } from "./env";

export class DatabaseWeb extends Effect.Service<DatabaseWeb>()(
  "app/Database/Web",
  {
    effect: Effect.gen(function* () {
      const env = yield* Env;

      // set application name for pg_stat_activity visibility
      const url = new URL(Redacted.value(env.webDatabaseUrl));
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
