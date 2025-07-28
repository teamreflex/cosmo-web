import "server-only";

import { env } from "@/env";
import { ofetch } from "ofetch";
import { abstract } from "./http";
import type { RPCResponse } from "./alchemy";
import type { SystemStatus } from "../universal/system";
import { unstable_cacheLife as cacheLife } from "next/cache";

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
export async function getSystemStatus(): Promise<FinalSystemStatus> {
  "use cache";
  cacheLife("system");

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
}
