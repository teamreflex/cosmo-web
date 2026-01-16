import { BunContext, BunRuntime } from "@effect/platform-bun";
import { ConfigProvider, Duration, Effect, Layer, Schedule } from "effect";
import { DatabaseWeb } from "./db";
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

  // monitor fiber health every 5 minutes
  yield* Effect.gen(function* () {
    const statuses = yield* Effect.all(
      fibers.map((f) => f.status),
      { concurrency: "unbounded" },
    );
    const running = statuses.filter((s) => s._tag === "Running").length;
    yield* Effect.logInfo(
      `Fiber health: ${running}/${fibers.length} tasks running`,
    );
  }).pipe(Effect.repeat(Schedule.spaced(Duration.minutes(5))), Effect.fork);

  // keep the main fiber alive to prevent process exit
  yield* Effect.never;
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
        Env.Default,
        DatabaseWeb.Default,
        ProxiedToken.Default,
        Redis.Default,
      ),
    ),
  ),
);
