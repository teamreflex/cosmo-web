import { Config, Effect } from "effect";

/**
 * Configuration for the import server
 */
export const getConfig = Effect.gen(function* () {
  const INDEXER_DATABASE_URL = yield* Config.redacted("INDEXER_DATABASE_URL");
  const WEB_DATABASE_URL = yield* Config.redacted("WEB_DATABASE_URL");
  const LOOP_INTERVAL = yield* Config.number("LOOP_INTERVAL").pipe(
    Config.withDefault(1000 * 60 * 10),
  );
  const TYPESENSE_API_KEY = yield* Config.redacted("TYPESENSE_API_KEY");
  const TYPESENSE_URL = yield* Config.string("TYPESENSE_URL").pipe(
    Config.withDefault("typesense"),
  );

  return {
    INDEXER_DATABASE_URL,
    WEB_DATABASE_URL,
    LOOP_INTERVAL,
    TYPESENSE_API_KEY,
    TYPESENSE_URL,
  };
});
