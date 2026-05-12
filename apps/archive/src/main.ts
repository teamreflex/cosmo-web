import { FetchHttpClient, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { ConfigProvider, Effect, Layer } from "effect";
import { Database } from "./db";
import { Env } from "./env";
import { Proxy } from "./proxy";
import { Recorder } from "./recorder";
import { Replay } from "./replay";
import { router } from "./router";

const main = Effect.gen(function* () {
  const env = yield* Env;
  yield* Effect.logInfo(
    `archive listening on port ${env.port} (mode=${env.mode})`,
  );
  const app = yield* router;
  yield* HttpServer.serveEffect()(app);
  return yield* Effect.never;
});

const ServerLayer = Layer.unwrapEffect(
  Env.pipe(Effect.map((env) => BunHttpServer.layer({ port: env.port }))),
).pipe(Layer.provide(Env.Default));

// preserve gzip framing on upstream responses; we forward Content-Encoding
// verbatim, so decompressing here would cause double-decompression on the client.
const FetchInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  decompress: false,
} satisfies RequestInit);

const ServicesLayer = Layer.mergeAll(
  Database.Default,
  Recorder.Default,
  Proxy.Default,
  Replay.Default,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(Env.Default, FetchHttpClient.layer, FetchInitLayer),
  ),
);

BunRuntime.runMain(
  Effect.scoped(main).pipe(
    Effect.catchAllCause((cause) => {
      console.error("FATAL", cause);
      return Effect.die(cause);
    }),
    Effect.withConfigProvider(ConfigProvider.fromEnv()),
    Effect.provide(Layer.merge(ServerLayer, ServicesLayer)),
  ),
);
