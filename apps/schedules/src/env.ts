import { Config, Context, Effect, Layer } from "effect";

export class Env extends Context.Service<Env>()("app/Env", {
  make: Effect.gen(function* () {
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
}) {
  static readonly layer = Layer.effect(this, this.make);
}
