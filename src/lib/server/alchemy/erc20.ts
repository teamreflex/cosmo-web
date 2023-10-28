import "server-only";
import { env } from "@/env.mjs";

type TokenBalanceRequest = {
  address: string;
  contracts: string[];
};

type AlchemyBalanceResponse = {
  jsonrpc: string;
  id: number;
  result: {
    address: string;
    tokenBalances: {
      contractAddress: string;
      tokenBalance: string;
    }[];
  };
};

export type DecodedTokenBalance = {
  contractAddress: string;
  tokenBalance: number;
};

const POLYGON_DECIMALS = 18;

/**
 * Fetch ERC20 token balances from the Alchemy API.
 *
 * @param {TokenBalanceRequest} config
 * @param {string} config.address
 * @param {string[]} config.contracts
 * @returns {Promise<DecodedTokenBalance[]>}
 */
export async function fetchTokenBalances({
  address,
  contracts,
}: TokenBalanceRequest): Promise<DecodedTokenBalance[]> {
  const endpoint = `https://polygon-mainnet.g.alchemy.com/v2/${env.NEXT_PUBLIC_ALCHEMY_KEY}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [address, contracts],
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch como balances");
  }

  const { result }: AlchemyBalanceResponse = await res.json();
  return result.tokenBalances.map((balance) => ({
    contractAddress: balance.contractAddress,
    tokenBalance: parseInt(balance.tokenBalance) / 10 ** POLYGON_DECIMALS,
  }));
}
