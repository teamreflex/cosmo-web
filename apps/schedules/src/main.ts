import { cleanupLayer } from "@apollo/queue";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { CosmoKey } from "./cosmo-key";
import { DatabaseWeb } from "./db";
import { DatabaseIndexer } from "./db-indexer";
import { Exchangerate } from "./exchangerate";
import { ProxiedToken } from "./proxied-token";
import { saleNotificationsWorker } from "./queues/sale-notifications";
import { tradeNotificationsWorker } from "./queues/trade-notifications";
import { redisLayer } from "./redis";
import { createResilientTask, SCHEDULED_TASKS } from "./task";

/**
 * Every queue worker, plus the cleanup that trims old job ids.
 * They run from the moment the layer is built until shutdown.
 */
const queueWorkers = Layer.mergeAll(
  tradeNotificationsWorker,
  saleNotificationsWorker,
  cleanupLayer,
).pipe(Layer.provide([DatabaseWeb.layer, redisLayer]));

const main = Effect.gen(function* () {
  yield* Effect.logInfo("Starting scheduled tasks...");

  // sequential on purpose: forking is instant
  const fibers = yield* Effect.all(SCHEDULED_TASKS.map(createResilientTask));

  yield* Effect.logInfo(`Started ${fibers.length} scheduled tasks`);

  // keep the main fiber alive: the task fibers are children of this one, so returning here would interrupt them
  return yield* Effect.never;
});

BunRuntime.runMain(
  main.pipe(
    Effect.provide(
      Layer.mergeAll(
        BunServices.layer,
        FetchHttpClient.layer,
        DatabaseWeb.layer,
        DatabaseIndexer.layer,
        ProxiedToken.layer,
        CosmoKey.layer,
        Exchangerate.layer,
        redisLayer,
        queueWorkers,
      ),
    ),
  ),
);
