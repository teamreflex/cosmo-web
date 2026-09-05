import { currentAccountQuery } from "@/lib/queries/core";
import { DEFAULT_CURRENCY } from "@/lib/universal/schema/currency";
import { formatPrice } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * The currency prices are shown in and a formatter from USD into it. Signed
 * out viewers, and a currency whose rate is missing, fall back to USD.
 */
export function useDisplayCurrency() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);

  const currency =
    account === null || account.fxRateToUsd === null
      ? DEFAULT_CURRENCY
      : account.user.currency;
  const rate = account?.fxRateToUsd ?? 1;

  return {
    currency,
    rateToUsd: rate,
    formatUsd: (usd: number) => formatPrice(usd / rate, currency),
  };
}
