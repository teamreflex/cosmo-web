import { Effect, Redacted } from "effect";
import { Client } from "typesense";
import { getConfig } from "./config";

export class Typesense extends Effect.Service<Typesense>()("app/Typesense", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    return new Client({
      nodes: [{ url: config.TYPESENSE_URL }],
      apiKey: Redacted.value(config.TYPESENSE_API_KEY),
      numRetries: 1,
      connectionTimeoutSeconds: 10,
      logLevel: "info",
    });
  }),
  dependencies: [],
}) {}
