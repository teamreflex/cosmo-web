import { Cron, Duration, Effect, Schedule } from "effect";
import type { DatabaseWeb } from "./db";
import type { Env } from "./env";
import { clearObjektStatsTask } from "./functions/clear-objekt-stats";
import { syncGravitiesTask } from "./functions/sync-gravities";
import type { ProxiedToken } from "./proxied-token";
import type { Redis } from "./redis";

export interface ScheduledTask<TSuccess = void, TFailure = unknown> {
  name: string;
  cron: string;
  timezone?: string;
  effect: Effect.Effect<
    TSuccess,
    TFailure,
    Redis | DatabaseWeb | ProxiedToken | Env
  >;
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  clearObjektStatsTask,
  syncGravitiesTask,
];

/**
 * Wraps a scheduled task with resilient error handling:
 * - Retries individual executions with exponential backoff
 * - Logs errors after retry exhaustion
 * - Ensures the task never dies (Effect.forever)
 * - Handles both errors and defects (catchAllCause)
 */
export const createResilientTask = Effect.fn(function* (task: ScheduledTask) {
  const cron = Cron.unsafeParse(task.cron, task.timezone ?? "UTC");
  const schedule = Schedule.cron(cron);

  yield* Effect.logInfo(`Starting task: ${task.name}`);

  return yield* Effect.fork(
    Effect.gen(function* () {
      yield* task.effect.pipe(
        // retry individual execution with exponential backoff (max 3 retries)
        Effect.retry(
          Schedule.exponential(Duration.seconds(1)).pipe(
            Schedule.compose(Schedule.recurs(3)),
          ),
        ),
        Effect.tapError((error) =>
          Effect.logError(`Task ${task.name} iteration failed`),
        ),
      );
    }).pipe(
      // repeat on cron schedule
      Effect.repeat(schedule),
      // catch any errors to prevent task death
      Effect.catchAllCause((cause) =>
        Effect.logFatal(`Task ${task.name} died`, cause),
      ),
      // keep trying forever - immediately restart if repeat stops
      Effect.forever,
    ),
  );
});
