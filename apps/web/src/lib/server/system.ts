import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { subsquidStatus } from "@apollo/database/indexer/schema";
import { abstract } from "./http";
import { remember } from "./cache";
import { indexer } from "./db/indexer";
import type { RPCResponse, SystemStatus } from "../universal/system";

/**
 * Fetch the current block height from the indexer.
 */
const fetchProcessorHeight = createServerOnlyFn(async () => {
  const [result] = await indexer.select().from(subsquidStatus).limit(1);
  return result?.height ?? 0;
});

/**
 * Fetch the current block height from the Abstract RPC.
 */
const fetchChainStatus = createServerOnlyFn(async () => {
  const blockNumber = await abstract<RPCResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
    },
  });

  return {
    blockHeight: parseInt(blockNumber.result),
  };
});

/**
 * Calculate status for indexer height.
 * - within 6000 blocks / 30 minutes: normal
 * - over 6000 but within 12000 blocks / 60 minutes: degraded
 * - more than 12000 blocks / 60 minutes: down
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  return await remember(`system-status`, 60 * 5, async () => {
    const [{ blockHeight }, processorHeight] = await Promise.all([
      fetchChainStatus(),
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
});
