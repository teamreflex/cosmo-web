import { Redis } from "@/redis";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Clear the objekt stats cache.
 */
export const clearObjektStatsTask = {
  name: "clear-objekt-stats",
  cron: "0 * * * *",
  effect: Effect.gen(function* () {
    const redis = yield* Redis;
    yield* redis.del("objekt-stats");
  }),
} satisfies ScheduledTask;
