import type { HttpClient } from "@effect/platform";
import { Cron, Duration, Effect, Schedule } from "effect";
import type { DatabaseWeb } from "./db";
import type { DatabaseIndexer } from "./db-indexer";
import type { Env } from "./env";
import { clearObjektStatsTask } from "./functions/clear-objekt-stats";
import { drainOutboxTask } from "./functions/drain-outbox";
import { syncCollectionPriceStatsTask } from "./functions/sync-collection-price-stats";
import { syncFxRatesTask } from "./functions/sync-fx-rates";
import { syncGravitiesTask } from "./functions/sync-gravities";
import { syncMembersTask } from "./functions/sync-members";
import type { ProxiedToken } from "./proxied-token";
import type { Redis } from "./redis";

export interface ScheduledTask<TSuccess = void, TFailure = unknown> {
  name: string;
  cron: string;
  timezone?: string;
  effect: Effect.Effect<
    TSuccess,
    TFailure,
    | Redis
    | DatabaseWeb
    | DatabaseIndexer
    | ProxiedToken
    | Env
    | HttpClient.HttpClient
  >;
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  clearObjektStatsTask,
  syncGravitiesTask,
  drainOutboxTask,
  syncFxRatesTask,
  syncCollectionPriceStatsTask,
  syncMembersTask,
];

/**
 * Wraps a scheduled task with resilient error handling:
 * - Retries individual executions with exponential backoff (max 3 retries)
 * - Failures (errors and defects) are logged with their cause, then the task
 *   waits for the next cron tick — the repeat schedule never ends
 * - Effect.repeat runs the effect once immediately, so every task executes
 *   at boot before settling into its cron cadence
 */
export const createResilientTask = Effect.fn("createResilientTask")(function* (
  task: ScheduledTask,
) {
  const cron = Cron.unsafeParse(task.cron, task.timezone ?? "UTC");
  const schedule = Schedule.cron(cron);

  yield* Effect.logInfo(`Starting task: ${task.name}`);

  return yield* Effect.fork(
    task.effect.pipe(
      Effect.retry({
        schedule: Schedule.exponential(Duration.seconds(1)),
        times: 3,
      }),
      Effect.catchAllCause((cause) =>
        Effect.logError(`Task ${task.name} failed`, cause),
      ),
      Effect.repeat(schedule),
    ),
  );
});
