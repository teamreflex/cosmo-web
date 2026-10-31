import { redisLayer } from "@apollo/services/redis";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Config, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { RateLimiter } from "effect/persistence";
import { TokenVerifier } from "./auth";
import { MessageCipher } from "./cipher";
import { ChatConfig } from "./config";
import { ChatRoutes } from "./http";
import { RedisEventsLive } from "./redis-events";
import { ChatServerLayer } from "./server";
import { ChatStore } from "./store";

// every live service, built at boot so a missing variable stops the process before it listens
const Services = Layer.mergeAll(
  ChatStore.layer,
  MessageCipher.layer,
  TokenVerifier.layer,
  RateLimiter.layer,
).pipe(
  Layer.provideMerge(ChatConfig.layer),
  Layer.provide(RateLimiter.layerStoreRedis()),
  Layer.provideMerge(redisLayer),
);

const Main = HttpRouter.serve(ChatRoutes).pipe(
  Layer.provide(RedisEventsLive),
  Layer.provideMerge(ChatServerLayer),
  Layer.provide(Services),
  Layer.provide(
    BunHttpServer.layerConfig({
      port: Config.Port("PORT"),
      /**
       * Close sockets at once on shutdown: an open Join never finishes on
       * its own, so waiting for it only delays every client's rejoin.
       */
      disablePreemptiveShutdown: Config.succeed(true),
      /**
       * Bun's default is 16 MB, and a frame is parsed before ChatAuth runs.
       * The largest real call, a 1000-character message, is a few kilobytes.
       */
      websocket: Config.succeed({ maxPayloadLength: 64 * 1024 }),
    }),
  ),
);

BunRuntime.runMain(Layer.launch(Main));
