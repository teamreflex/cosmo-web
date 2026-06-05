import { redis, remember } from "@/lib/server/cache.server";
import { abstract } from "@/lib/server/http.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { fetchProcessorHeight } from "@/lib/server/system.server";
import type {
  MetadataStatus,
  RPCResponse,
  SystemStatus,
} from "@/lib/universal/system";
import { COSMO_V1_STATUS_KEY } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch the current block height from the Abstract RPC.
 */
async function fetchChainStatus(signal?: AbortSignal) {
  const blockNumber = await abstract<RPCResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
    },
    signal,
  });

  return {
    blockHeight: parseInt(blockNumber.result),
  };
}

/**
 * Calculate status for indexer height.
 * - within 6000 blocks / 30 minutes: normal
 * - over 6000 but within 12000 blocks / 60 minutes: degraded
 * - more than 12000 blocks / 60 minutes: down
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  const signal = getRequestSignal();

  // processor sync status stays cached for 5 minutes (it changes slowly)...
  const { processor } = await remember(`system-status`, 60 * 5, async () => {
    const [{ blockHeight }, processorHeight] = await Promise.all([
      fetchChainStatus(signal),
      fetchProcessorHeight(),
    ]);

    // calculate processor status
    const diff = blockHeight - processorHeight;
    const status: SystemStatus =
      diff < 6000 ? "normal" : diff < 12000 ? "degraded" : "down";

    return {
      processor: {
        status,
        height: {
          processor: processorHeight,
          chain: blockHeight,
        },
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
