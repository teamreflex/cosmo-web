import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { Effect, Redacted } from "effect";
import { Env } from "./env";
import { SQL } from "bun";

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
        max: 2, // only need 1-2 connections for single-threaded app
        idleTimeout: 60, // close idle connections after 1 minute
        maxLifetime: 3600, // recycle connections every hour
        connectionTimeout: 30, // timeout for establishing new connections
      });
      return drizzle({ client, relations });
    }),
    dependencies: [Env.Default],
  },
) {}
