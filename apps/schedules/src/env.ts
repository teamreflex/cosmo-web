import { Config, Effect } from "effect";

export class Env extends Effect.Service<Env>()("app/Env", {
  effect: Effect.gen(function* () {
    const webDatabaseUrl = yield* Config.redacted("WEB_DATABASE_URL");
    const redisUrl = yield* Config.redacted("REDIS_URL");

    return {
      webDatabaseUrl,
      redisUrl,
    };
  }),
  dependencies: [],
}) {}
