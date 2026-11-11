import { Config, Context, Effect, Layer, Option, Redacted, Ref } from "effect";
import { Client } from "typesense";

export class Typesense extends Context.Service<Typesense>()("app/Typesense", {
  make: Effect.gen(function* () {
    const url = yield* Config.String("TYPESENSE_URL");
    const apiKey = yield* Config.Redacted("TYPESENSE_API_KEY");

    return {
      // not scoped: the client is fetch-per-request and exposes no close API
      client: new Client({
        nodes: [{ url }],
        apiKey: Redacted.value(apiKey),
        numRetries: 1,
        connectionTimeoutSeconds: 10,
        logLevel: "info",
      }),
      /**
       * What `sync-typesense` has imported in this process: none until a run
       * has set the collection up and imported every indexer collection. It
       * lives in the service because a service is built once per process,
       * while a task's effect runs again on every tick.
       */
      imported: yield* Ref.make(
        Option.none<{
          // the newest imported collection's createdAt in epoch ms, or 0 before any
          readonly watermark: number;
          // ids flagged unobtainable as of the last successful run
          readonly flagged: ReadonlySet<string>;
        }>(),
      ),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make);
}
