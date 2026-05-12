import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { Data, Effect, Redacted } from "effect";
import { Env } from "./env";
import { relations } from "./relations";

export class MigrationError extends Data.TaggedError("MigrationError")<{
  cause: unknown;
}> {}

export class Database extends Effect.Service<Database>()("app/Database", {
  effect: Effect.gen(function* () {
    const env = yield* Env;

    const url = new URL(Redacted.value(env.dbUrl));
    url.searchParams.set("application_name", "Archive");

    const client = new SQL({
      url: url.toString(),
      max: 4,
    });
    const db = drizzle({ client, relations });

    yield* Effect.logInfo("applying migrations");
    yield* Effect.tryPromise({
      try: () => migrate(db, { migrationsFolder: "./drizzle" }),
      catch: (cause) => new MigrationError({ cause }),
    });

    return db;
  }),
  dependencies: [Env.Default],
}) {}
