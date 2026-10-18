import { remember } from "@/lib/server/cache.server";
import { fetchBlockTimestamp, runAbstract } from "@/lib/server/http.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { fetchProcessorHeight } from "@/lib/server/system.server";
import type { SystemStatus } from "@/lib/universal/system";
import { createServerFn } from "@tanstack/react-start";
import { differenceInMinutes } from "date-fns";

/**
 * Calculate status from the age of the indexer's latest block.
 * - within 30 minutes: normal
 * - within 60 minutes: degraded
 * - more than 60 minutes: down
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  const signal = getRequestSignal();
  return await remember(`system-status:v2`, 60 * 2, async () => {
    const timestamp = await runAbstract(
      fetchBlockTimestamp(await fetchProcessorHeight()),
      signal,
    );

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
});
