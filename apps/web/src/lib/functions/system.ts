import { redis } from "@/lib/server/cache.server";
import type { SystemStatus } from "@/lib/universal/system";
import { processorHeadKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import { differenceInMinutes } from "date-fns";

/**
 * Calculate status from the age of the newest block the indexer has applied,
 * which schedules' `sync-processor-head` stores every minute.
 * - within 30 minutes: normal
 * - within 60 minutes: degraded
 * - more than 60 minutes: down
 * `processor` is null while no head is stored, which means that task stopped.
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  const stored = await redis.get(processorHeadKey);
  const timestamp = new Date(stored ?? Number.NaN);
  if (Number.isNaN(timestamp.getTime())) {
    return { processor: null };
  }

  const age = differenceInMinutes(new Date(), timestamp);
  const status: SystemStatus =
    age < 30 ? "normal" : age < 60 ? "degraded" : "down";

  return {
    processor: {
      status,
      timestamp: timestamp.toISOString(),
    },
  };
});
