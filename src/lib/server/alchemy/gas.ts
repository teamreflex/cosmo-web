import { GasPrice } from "@/lib/universal/alchemy/gas";
import { formatUnits } from "ethers/lib/utils";
import { alchemy } from "../http";

type GasPriceResult = {
  jsonrpc: string;
  id: number;
  result: string;
};

/**
 * Fetch current gas price from the Alchemy API.
 */
export async function fetchGasPrice(): Promise<GasPrice> {
  return await alchemy<GasPriceResult>("/", {
    body: {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_gasPrice",
    },
    next: {
      tags: ["gas-price"],
      revalidate: 60, // 60s
    },
  })
    .then((res) => {
      const price = Math.round(parseInt(formatUnits(res.result, "gwei")));
      const status = price < 400 ? "low" : price < 1000 ? "medium" : "high";
      return { price, status } as const;
    })
    .catch((_) => ({ price: 0, status: "low" }));
}
