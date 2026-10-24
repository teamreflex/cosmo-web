import { Cron, Duration, Effect, Schedule } from "effect";
import type { HttpClient } from "effect/http";
import type { Redis } from "effect/persistence";
import type { DatabaseWeb } from "./db";
import type { DatabaseIndexer } from "./db-indexer";
import type { Exchangerate } from "./exchangerate";
import { applySerialConfirmationsTask } from "./functions/apply-serial-confirmations";
import { clearObjektStatsTask } from "./functions/clear-objekt-stats";
import { drainOutboxTask } from "./functions/drain-outbox";
import { recomputeSerialsTask } from "./functions/recompute-serials";
import { syncCollectionPriceStatsTask } from "./functions/sync-collection-price-stats";
import { syncFxRatesTask } from "./functions/sync-fx-rates";
import { syncGravitiesTask } from "./functions/sync-gravities";
import { syncMembersTask } from "./functions/sync-members";
import type { ProxiedToken } from "./proxied-token";

export interface ScheduledTask<TSuccess = void, TFailure = unknown> {
  name: string;
  cron: string;
  timezone?: string;
  runAtBoot?: boolean;
  effect: Effect.Effect<
    TSuccess,
    TFailure,
    | Redis.Redis
    | DatabaseWeb
    | DatabaseIndexer
    | ProxiedToken
    | Exchangerate
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
  recomputeSerialsTask,
  applySerialConfirmationsTask,
];

/**
 * Wraps a scheduled task with resilient error handling:
 * - Retries individual executions with exponential backoff (max 3 retries)
 * - Failures (errors and defects) are logged with their cause, then the task
 *   waits for the next cron tick — the repeat schedule never ends
 * - Effect.repeat runs the effect once immediately, so a task executes at
 *   boot before settling into its cron cadence, unless `runAtBoot` is false,
 *   where Effect.schedule waits for the first cron tick
 */
export const createResilientTask = Effect.fn("createResilientTask")(function* (
  task: ScheduledTask,
) {
  const cron = Cron.parseUnsafe(task.cron, task.timezone ?? "UTC");
  const schedule = Schedule.cron(cron);

  yield* Effect.logInfo(`Starting task: ${task.name}`);

  const run = task.effect.pipe(
    Effect.retry({
      schedule: Schedule.exponential(Duration.seconds(1)),
      times: 3,
    }),
    Effect.catchCause((cause) =>
      Effect.logError(`Task ${task.name} failed`, cause),
    ),
  );

  return yield* Effect.forkChild(
    task.runAtBoot === false
      ? Effect.schedule(run, schedule)
      : Effect.repeat(run, schedule),
  );
});
