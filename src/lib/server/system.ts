import "server-only";

import { env } from "@/env.mjs";
import { ofetch } from "ofetch";
import { alchemy } from "./http";
import { RPCResponse } from "./alchemy/common";
import { SystemStatus } from "../universal/system";

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
    cache: "no-cache",
  });

  return result.height;
}

/**
 * Fetch the current block height from the Alchemy API.
 */
async function getChainHeight() {
  const { result } = await alchemy<RPCResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_blockNumber",
    },
  });

  return parseInt(result);
}

type ProcessorStatus = {
  status: SystemStatus;
  height: {
    processor: number;
    chain: number;
  };
};

/**
 * Fetch block heights for the indexer and the chain.
 * - within 400 blocks: normal
 * - over 400 but within 1600 blocks: degraded
 * - more than 1600 blocks: down
 */
export async function fetchProcessorStatus(): Promise<ProcessorStatus> {
  const [processor, chain] = await Promise.all([
    fetchProcessorHeight(),
    getChainHeight(),
  ]);

  const diff = chain - processor;
  const status = diff < 400 ? "normal" : diff < 1600 ? "degraded" : "down";

  return {
    status,
    height: {
      processor,
      chain,
    },
  };
}
