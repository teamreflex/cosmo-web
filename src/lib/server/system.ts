import "server-only";

import { env } from "@/env.mjs";
import { ofetch } from "ofetch";
import { alchemy } from "./http";
import { RPCResponse } from "./alchemy/common";
import { SystemStatus } from "../universal/system";
import { unstable_cache } from "next/cache";
import { formatGwei } from "viem";

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
  gas: {
    price: number;
    status: SystemStatus;
  };
};

/**
 * Fetch the current block height and gas price from the Alchemy API.
 * Requested in a batch.
 */
export async function fetchChainStatus(): Promise<ChainStatus> {
  const [blockNumber, gasPrice] = await alchemy<RPCResponse[]>("/", {
    body: [
      // polygon block number
      {
        id: 1,
        jsonrpc: "2.0",
        method: "eth_blockNumber",
      },
      // polygon gas price
      {
        id: 2,
        jsonrpc: "2.0",
        method: "eth_gasPrice",
      },
    ],
  });

  const price = Math.round(Number(formatGwei(BigInt(gasPrice.result))));
  const status = price < 400 ? "normal" : price < 1000 ? "degraded" : "down";

  return {
    blockHeight: parseInt(blockNumber.result),
    gas: { price, status } as const,
  };
}

type FinalSystemStatus = {
  gas: {
    price: number;
    status: SystemStatus;
  };
  processor: {
    status: SystemStatus;
    height: {
      processor: number;
      chain: number;
    };
  };
};

/**
 * Calculate statuses for gas price and indexer height.
 * - within 400 blocks: normal
 * - over 400 but within 1600 blocks: degraded
 * - more than 1600 blocks: down
 */
export const getSystemStatus = unstable_cache(
  async (): Promise<FinalSystemStatus> => {
    const [{ gas, blockHeight }, processorHeight] = await Promise.all([
      fetchChainStatus(),
      fetchProcessorHeight(),
    ]);

    // calculate processor status
    const diff = blockHeight - processorHeight;
    const status = diff < 400 ? "normal" : diff < 1600 ? "degraded" : "down";

    return {
      gas,
      processor: {
        status,
        height: {
          processor: processorHeight,
          chain: blockHeight,
        },
      },
    };
  },
  ["system-status"],
  {
    revalidate: 60, // 60 seconds
  }
);
