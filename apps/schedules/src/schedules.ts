import type { Effect } from "effect";
import type { DatabaseWeb } from "./db";
import type { Env } from "./env";
import type { ProxiedToken } from "./proxied-token";
import type { Redis } from "./redis";
import { clearObjektStatsTask } from "./functions/clear-objekt-stats";
import { syncGravitiesTask } from "./functions/sync-gravities";

export interface ScheduledTask<TSuccess = void, TFailure = unknown> {
  name: string;
  cron: string;
  timezone?: string;
  effect: Effect.Effect<
    TSuccess,
    TFailure,
    Redis | DatabaseWeb | ProxiedToken | Env | never
  >;
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  clearObjektStatsTask,
  syncGravitiesTask,
];
