import { GasPrice } from "@/lib/universal/alchemy/gas";
import { formatUnits } from "ethers/lib/utils";
import { alchemy } from "../http";
import { unstable_cache } from "next/cache";

type GasPriceResult = {
  jsonrpc: string;
  id: number;
  result: string;
};

/**
 * Fetch current gas price from the Alchemy API.
 * Cached for 1 minute.
 */
export const fetchGasPrice = unstable_cache(
  async (): Promise<GasPrice> =>
    alchemy<GasPriceResult>("/", {
      body: {
        id: 1,
        jsonrpc: "2.0",
        method: "eth_gasPrice",
      },
    })
      .then((res) => {
        const price = Math.round(parseInt(formatUnits(res.result, "gwei")));
        const status = price < 400 ? "low" : price < 1000 ? "medium" : "high";
        return { price, status } as const;
      })
      .catch((_) => ({ price: 0, status: "low" })),
  ["gas-price"],
  {
    revalidate: 60, // 60s
  }
);
