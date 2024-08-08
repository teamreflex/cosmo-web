import { formatUnits } from "ethers/lib/utils";
import { alchemy } from "../http";
import { unstable_cache } from "next/cache";
import { RPCResponse } from "./common";
import { SystemStatus } from "@/lib/universal/system";

type GasPrice = {
  price: number;
  status: SystemStatus;
};

/**
 * Fetch current gas price from the Alchemy API.
 * Cached for 1 minute.
 */
export const fetchGasPrice = unstable_cache(
  async (): Promise<GasPrice> =>
    alchemy<RPCResponse>("/", {
      body: {
        id: 1,
        jsonrpc: "2.0",
        method: "eth_gasPrice",
      },
    })
      .then((res) => {
        const price = Math.round(parseInt(formatUnits(res.result, "gwei")));
        const status =
          price < 400 ? "normal" : price < 1000 ? "degraded" : "down";
        return { price, status } as const;
      })
      .catch((_) => ({ price: 0, status: "normal" })),
  ["gas-price"],
  {
    revalidate: 60, // 60s
  }
);
