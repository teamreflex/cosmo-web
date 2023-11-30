import { env } from "@/env.mjs";
import { GasPrice } from "@/lib/universal/alchemy/gas";
import { formatUnits } from "ethers/lib/utils";

type GasPriceResult = {
  jsonrpc: string;
  id: number;
  result: string;
};

/**
 * Fetch current gas price from the Alchemy API.
 */
export async function fetchGasPrice(): Promise<GasPrice> {
  const endpoint = `https://polygon-mainnet.g.alchemy.com/v2`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_gasPrice",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch gas price");
  }

  const { result }: GasPriceResult = await res.json();
  const price = Math.round(parseInt(formatUnits(result, "gwei")));
  const status = price < 400 ? "low" : price < 1000 ? "medium" : "high";

  return { price, status };
}
