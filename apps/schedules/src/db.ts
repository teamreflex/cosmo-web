import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { Effect, Redacted } from "effect";
import { Env } from "./env";

export class DatabaseWeb extends Effect.Service<DatabaseWeb>()(
  "app/Database/Web",
  {
    effect: Effect.gen(function* () {
      const env = yield* Env;
      return drizzle(Redacted.value(env.webDatabaseUrl), { relations });
    }),
    dependencies: [Env.Default],
  },
) {}
