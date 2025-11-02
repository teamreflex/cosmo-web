import { Effect, Redacted } from "effect";
import { Client } from "typesense";
import { getConfig } from "./config";

export class Typesense extends Effect.Service<Typesense>()("app/Typesense", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    return new Client({
      nodes: [
        {
          host: config.TYPESENSE_HOST,
          port: config.TYPESENSE_PORT,
          protocol: config.TYPESENSE_PROTOCOL,
        },
      ],
      apiKey: Redacted.value(config.TYPESENSE_API_KEY),
      numRetries: 1,
      connectionTimeoutSeconds: 10,
      logLevel: "info",
    });
  }),
  dependencies: [],
}) {}
