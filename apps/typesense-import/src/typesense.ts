import { Context, Effect, Layer, Redacted } from "effect";
import { Client } from "typesense";
import { Env } from "./config";

// not scoped: the typesense Client is fetch-per-request and exposes no close API
export class Typesense extends Context.Service<Typesense>()("app/Typesense", {
  make: Effect.gen(function* () {
    const env = yield* Env;

    return new Client({
      nodes: [{ url: env.TYPESENSE_URL }],
      apiKey: Redacted.value(env.TYPESENSE_API_KEY),
      numRetries: 1,
      connectionTimeoutSeconds: 10,
      logLevel: "info",
    });
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Env.layer),
  );
}
