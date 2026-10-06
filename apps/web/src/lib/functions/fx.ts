import { fetchFxCurrencies } from "@/lib/server/objekts/fx.server";
import { createServerFn } from "@tanstack/react-start";

/**
 * Currencies a sale list or viewer setting may use.
 */
export const $fetchFxCurrencies = createServerFn({ method: "GET" }).handler(
  () => fetchFxCurrencies(),
);
