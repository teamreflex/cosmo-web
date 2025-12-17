import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { Effect, Redacted } from "effect";
import { getConfig } from "../config";

export class Metadata extends Effect.Service<Metadata>()("app/Metadata", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    // set application name for pg_stat_activity visibility
    const url = new URL(Redacted.value(config.WEB_DATABASE_URL));
    url.searchParams.set("application_name", "Importer");

    const client = new SQL({
      url: url.toString(),
      max: 1, // only need 1 connection for single-threaded app
    });
    return drizzle({ client, relations });
  }),
  dependencies: [],
}) {}
