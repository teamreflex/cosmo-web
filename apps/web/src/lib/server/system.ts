import { ofetch } from "ofetch";
import { createServerFn } from "@tanstack/react-start";
import { abstract } from "./http";
import { remember } from "./cache";
import type { RPCResponse, SystemStatus } from "../universal/system";
import { env } from "@/lib/env/server";

type Status = {
  height: number;
  hash: string;
};

/**
 * Fetch the current block height from the indexer.
 */
async function fetchProcessorHeight() {
  const result = await ofetch<Status>(`${env.INDEXER_PROXY_URL}/status`, {
    headers: {
      "proxy-key": env.INDEXER_PROXY_KEY,
    },
  });

  return result.height;
}

type ChainStatus = {
  blockHeight: number;
};

/**
 * Fetch the current block height from the Alchemy API.
 */
async function fetchChainStatus(): Promise<ChainStatus> {
  const blockNumber = await abstract<RPCResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_blockNumber",
    },
  });

  return {
    blockHeight: parseInt(blockNumber.result),
  };
}

type FinalSystemStatus = {
  processor: {
    status: SystemStatus;
    height: {
      processor: number;
      chain: number;
    };
  };
};

/**
 * Calculate status for indexer height.
 * - within 1800 blocks / 30 minutes: normal
 * - over 1800 but within 3600 blocks / 60 minutes: degraded
 * - more than 3600 blocks / 60 minutes: down
 */
export const $fetchSystemStatus = createServerFn().handler(async () => {
  return await remember(
    `system-status`,
    60,
    async (): Promise<FinalSystemStatus> => {
      const [{ blockHeight }, processorHeight] = await Promise.all([
        fetchChainStatus(),
        fetchProcessorHeight(),
      ]);

      // calculate processor status
      const diff = blockHeight - processorHeight;
      const status = diff < 1800 ? "normal" : diff < 3600 ? "degraded" : "down";

      return {
        processor: {
          status,
          height: {
            processor: processorHeight,
            chain: blockHeight,
          },
        },
      };
    },
  );
});
