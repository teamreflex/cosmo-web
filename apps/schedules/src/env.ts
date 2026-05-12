import { Config, Effect } from "effect";

export class Env extends Effect.Service<Env>()("app/Env", {
  effect: Effect.gen(function* () {
    const webDatabaseUrl = yield* Config.redacted("WEB_DATABASE_URL");
    const indexerDatabaseUrl = yield* Config.redacted("INDEXER_DATABASE_URL");
    const redisUrl = yield* Config.redacted("REDIS_URL");
    const exchangerateApiKey = yield* Config.redacted("EXCHANGERATE_API_KEY");
    const cosmoKey = yield* Config.redacted("COSMO_KEY");

    return {
      webDatabaseUrl,
      indexerDatabaseUrl,
      redisUrl,
      exchangerateApiKey,
      cosmoKey,
    };
  }),
  dependencies: [],
}) {}
