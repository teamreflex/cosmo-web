import { BunContext, BunRuntime } from "@effect/platform-bun";
import { ConfigProvider, Cron, Effect, Layer, Schedule } from "effect";
import { DatabaseWeb } from "./db";
import { Env } from "./env";
import { ProxiedToken } from "./proxied-token";
import { Redis } from "./redis";
import { SCHEDULED_TASKS } from "./schedules";

const main = Effect.gen(function* () {
  yield* Effect.logInfo("Starting scheduled tasks...");

  // fork each scheduled task as a daemon fiber
  const fibers = yield* Effect.all(
    SCHEDULED_TASKS.map((task) =>
      Effect.gen(function* () {
        // parse the cron expression
        const cron = Cron.unsafeParse(task.cron, task.timezone ?? "UTC");
        const schedule = Schedule.cron(cron);

        // log task startup
        yield* Effect.logInfo(`Starting task: ${task.name} (${task.cron})`);

        // run the task on the schedule forever
        return yield* Effect.fork(
          task.effect.pipe(
            Effect.repeat(schedule),
            Effect.catchAll((error) =>
              Effect.logError(`Task ${task.name} failed: ${error}`),
            ),
          ),
        );
      }),
    ),
    { concurrency: "unbounded" },
  );

  yield* Effect.logInfo(`Started ${fibers.length} scheduled tasks`);

  // keep the main fiber alive to prevent process exit
  yield* Effect.never;
});

const layers = Layer.mergeAll(
  BunContext.layer,
  Env.Default,
  DatabaseWeb.Default,
  ProxiedToken.Default,
  Redis.Default,
);

BunRuntime.runMain(
  main.pipe(
    Effect.withConfigProvider(ConfigProvider.fromEnv()),
    Effect.provide(layers),
  ),
);
