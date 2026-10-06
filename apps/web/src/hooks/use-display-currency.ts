import type { GetAccount } from "@/lib/functions/core";
import { currentAccountQuery } from "@/lib/queries/core";
import { DEFAULT_CURRENCY } from "@/lib/universal/schema/currency";
import { formatPrice } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useDisplayCurrency() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  return displayCurrency(account);
}

/**
 * The currency prices are shown in and a formatter from USD into it. Signed
 * out viewers, and a currency whose rate is missing, fall back to USD.
 */
export function displayCurrency(account: GetAccount | null) {
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
