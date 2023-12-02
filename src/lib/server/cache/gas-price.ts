import "server-only";
import { remember } from "./common";
import { fetchGasPrice } from "../alchemy/gas";
import { GasPrice } from "@/lib/universal/alchemy/gas";

/**
 * Fetch gas price from Alchemy and cache it for 60 seconds.
 */
export async function getCachedGasPrice(): Promise<GasPrice> {
  return await remember("gas-price", 60, async () => {
    try {
      return await fetchGasPrice();
    } catch (err) {
      return { price: 0, status: "low" };
    }
  });
}
