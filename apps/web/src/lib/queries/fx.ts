import { $fetchFxCurrencies } from "@/lib/functions/fx";
import { queryOptions } from "@tanstack/react-query";

export const fxCurrenciesQuery = queryOptions({
  queryKey: ["fx-currencies"],
  queryFn: ({ signal }) => $fetchFxCurrencies({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
