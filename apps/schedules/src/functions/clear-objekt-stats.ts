import { Effect } from "effect";
import { Redis } from "effect/unstable/persistence";
import type { ScheduledTask } from "../task";

/**
 * Clear the objekt stats cache.
 */
export const clearObjektStatsTask = {
  name: "clear-objekt-stats",
  cron: "0 * * * *",
  effect: Effect.gen(function* () {
    const redis = yield* Redis.Redis;
    yield* redis.send("DEL", "objekt-stats");
  }),
} satisfies ScheduledTask;
