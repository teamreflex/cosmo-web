import { Config, Effect } from "effect";

/**
 * Configuration for the import server
 */
export const getConfig = Effect.gen(function* () {
  const DB_INDEXER = yield* Config.redacted("DB_INDEXER");
  const DB_INDEXER_KEY = yield* Config.redacted("DB_INDEXER_KEY");
  const DB_METADATA = yield* Config.redacted("DB_METADATA");
  const LOOP_INTERVAL = yield* Config.number("LOOP_INTERVAL").pipe(
    Config.withDefault(1000 * 60 * 10),
  );
  const TYPESENSE_API_KEY = yield* Config.redacted("TYPESENSE_API_KEY");
  const TYPESENSE_HOST = yield* Config.string("TYPESENSE_HOST").pipe(
    Config.withDefault("typesense"),
  );
  const TYPESENSE_PORT = yield* Config.number("TYPESENSE_PORT").pipe(
    Config.withDefault(8108),
  );
  const TYPESENSE_PROTOCOL = yield* Config.string("TYPESENSE_PROTOCOL").pipe(
    Config.withDefault("http"),
  );

  return {
    DB_INDEXER,
    DB_INDEXER_KEY,
    DB_METADATA,
    LOOP_INTERVAL,
    TYPESENSE_API_KEY,
    TYPESENSE_HOST,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
  };
});
