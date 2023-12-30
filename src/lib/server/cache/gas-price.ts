import "server-only";
import { fetchGasPrice } from "../alchemy/gas";
import { GasPrice } from "@/lib/universal/alchemy/gas";
import { unstable_cache } from "next/cache";

/**
 * Fetch gas price from Alchemy and cache it for 60 seconds.
 */
export const getCachedGasPrice = unstable_cache(
  async (): Promise<GasPrice> => {
    try {
      return fetchGasPrice();
    } catch (err) {
      return { price: 0, status: "low" };
    }
  },
  ["gas-price"],
  { revalidate: 60 }
);
