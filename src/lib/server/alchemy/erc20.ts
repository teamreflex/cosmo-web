import "server-only";
import { alchemy } from "../http";

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
 * Cached for 15 minutes,
 */
export async function fetchTokenBalances({
  address,
  contracts,
}: TokenBalanceRequest): Promise<DecodedTokenBalance[]> {
  return await alchemy<AlchemyBalanceResponse>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [address, contracts],
    },
    next: {
      tags: ["como", address],
      revalidate: 60 * 15, // 15 minutes
    },
  }).then((res) =>
    res.result.tokenBalances.map((balance) => ({
      contractAddress: balance.contractAddress,
      tokenBalance: Math.floor(
        parseInt(balance.tokenBalance) / 10 ** POLYGON_DECIMALS
      ),
    }))
  );
}
