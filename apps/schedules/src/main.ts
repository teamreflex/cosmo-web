import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { CosmoKey } from "./cosmo-key";
import { DatabaseWeb } from "./db";
import { DatabaseIndexer } from "./db-indexer";
import { Env } from "./env";
import { ProxiedToken } from "./proxied-token";
import { redisLayer } from "./redis";
import { createResilientTask, SCHEDULED_TASKS } from "./task";

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
        Env.layer,
        DatabaseWeb.layer,
        DatabaseIndexer.layer,
        ProxiedToken.layer,
        CosmoKey.layer,
        redisLayer,
      ),
    ),
  ),
);
