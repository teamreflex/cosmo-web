import { Effect, Redacted } from "effect";
import { Client } from "typesense";
import { Env } from "./config";

// not scoped: the typesense Client is fetch-per-request and exposes no close API
export class Typesense extends Effect.Service<Typesense>()("app/Typesense", {
  effect: Effect.gen(function* () {
    const env = yield* Env;

    return new Client({
      nodes: [{ url: env.TYPESENSE_URL }],
      apiKey: Redacted.value(env.TYPESENSE_API_KEY),
      numRetries: 1,
      connectionTimeoutSeconds: 10,
      logLevel: "info",
    });
  }),
  dependencies: [Env.Default],
}) {}
