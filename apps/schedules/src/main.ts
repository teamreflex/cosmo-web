import { FetchHttpClient } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { ConfigProvider, Effect, Layer } from "effect";
import { DatabaseWeb } from "./db";
import { DatabaseIndexer } from "./db-indexer";
import { Env } from "./env";
import { ProxiedToken } from "./proxied-token";
import { Redis } from "./redis";
import { createResilientTask, SCHEDULED_TASKS } from "./task";

const main = Effect.gen(function* () {
  yield* Effect.logInfo("Starting scheduled tasks...");

  const fibers = yield* Effect.all(SCHEDULED_TASKS.map(createResilientTask), {
    concurrency: "unbounded",
  });

  yield* Effect.logInfo(`Started ${fibers.length} scheduled tasks`);

  // keep the main fiber alive to prevent process exit
  return yield* Effect.never;
});

BunRuntime.runMain(
  main.pipe(
    Effect.catchAllCause((cause) => {
      console.error("FATAL: Main application crashed", cause);
      // allow the process manager to restart
      return Effect.die(cause);
    }),
    Effect.withConfigProvider(ConfigProvider.fromEnv()),
    Effect.provide(
      Layer.mergeAll(
        BunContext.layer,
        FetchHttpClient.layer,
        Env.Default,
        DatabaseWeb.Default,
        DatabaseIndexer.Default,
        ProxiedToken.Default,
        Redis.Default,
      ),
    ),
  ),
);
