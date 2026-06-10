import { redis, remember } from "@/lib/server/cache.server";
import { abstract } from "@/lib/server/http.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { fetchProcessorHeight } from "@/lib/server/system.server";
import type {
  BlockResponse,
  MetadataStatus,
  SystemStatus,
} from "@/lib/universal/system";
import { COSMO_V1_STATUS_KEY } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch the unix timestamp (seconds) of a block from the Abstract RPC.
 */
async function fetchBlockTimestamp(height: number, signal?: AbortSignal) {
  const block = await abstract<BlockResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: [`0x${height.toString(16)}`, false],
    },
    signal,
  });

  return block.result === null ? null : parseInt(block.result.timestamp, 16);
}

/**
 * Calculate processor status from how stale its last indexed block is.
 * - under 30 minutes behind: normal
 * - 30 to 60 minutes behind: degraded
 * - over 60 minutes behind: down
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  const signal = getRequestSignal();

  // processor sync status stays cached for 5 minutes (it changes slowly)...
  const { processor } = await remember(`system-status`, 60 * 5, async () => {
    // the processor's last block timestamp gives us the lag directly, so we read
    // its height then ask the chain when that block landed (no chain-head call).
    const processorHeight = await fetchProcessorHeight();
    const blockTimestamp = await fetchBlockTimestamp(processorHeight, signal);

    // a null block means a lagging RPC replica hasn't seen the processor's
    // head block yet, which only happens when the processor is caught up.
    const lagSeconds =
      blockTimestamp === null
        ? 0
        : Math.max(0, Math.floor(Date.now() / 1000) - blockTimestamp);
    const status: SystemStatus =
      lagSeconds < 1800 ? "normal" : lagSeconds < 3600 ? "degraded" : "down";

    return {
      processor: {
        status,
        lagSeconds,
      },
    };
  });

  // ...but the v1 metadata signal is read fresh so an outage isn't masked by the
  // 5-minute cache. An absent/unknown key means healthy (no false alarm).
  const metadataStatus = await redis.get(COSMO_V1_STATUS_KEY);
  const metadata = {
    status: metadataStatus === "down" ? "down" : "operational",
  } satisfies { status: MetadataStatus };

  return { processor, metadata };
});
