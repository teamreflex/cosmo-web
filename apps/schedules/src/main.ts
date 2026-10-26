import { cleanupLayer } from "@apollo/queue";
import { redisLayer } from "@apollo/services/redis";
import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { tradeNotificationsWorker } from "./queues/trade-notifications";
import { servicesLayer, webDatabaseLayer } from "./services";
import { createResilientTask, SCHEDULED_TASKS } from "./task";

/**
 * Every queue worker, plus the cleanup that trims old job ids.
 * They run from the moment the layer is built until shutdown.
 */
const queueWorkers = Layer.mergeAll(
  tradeNotificationsWorker,
  cleanupLayer,
).pipe(Layer.provide([webDatabaseLayer, redisLayer]));

const main = Effect.gen(function* () {
  yield* Effect.logInfo("Starting scheduled tasks...");

  // sequential on purpose: forking is instant
  const fibers = yield* Effect.all(SCHEDULED_TASKS.map(createResilientTask));

  yield* Effect.logInfo(`Started ${fibers.length} scheduled tasks`);

  // keep the main fiber alive: the task fibers are children of this one, so returning here would interrupt them
  return yield* Effect.never;
});

BunRuntime.runMain(
  main.pipe(Effect.provide(Layer.mergeAll(servicesLayer, queueWorkers))),
);
