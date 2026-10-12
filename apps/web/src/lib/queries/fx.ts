import { $fetchFxCurrencies } from "@/lib/functions/fx";
import { queryOptions } from "@tanstack/react-query";

/**
 * Currencies with an FX rate, for the currency select.
 */
export const fxCurrenciesQuery = queryOptions({
  queryKey: ["fx-currencies"],
  queryFn: ({ signal }) => $fetchFxCurrencies({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
