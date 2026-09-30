import { Config, Context, Effect, Layer, Redacted } from "effect";
import { Client } from "typesense";

// not scoped: the typesense Client is fetch-per-request and exposes no close API
export class Typesense extends Context.Service<Typesense>()("app/Typesense", {
  make: Effect.gen(function* () {
    const url = yield* Config.String("TYPESENSE_URL").pipe(
      Config.withDefault("typesense"),
    );
    const apiKey = yield* Config.Redacted("TYPESENSE_API_KEY");

    return new Client({
      nodes: [{ url }],
      apiKey: Redacted.value(apiKey),
      numRetries: 1,
      connectionTimeoutSeconds: 10,
      logLevel: "info",
    });
  }),
}) {
  static readonly layer = Layer.effect(this, this.make);
}
