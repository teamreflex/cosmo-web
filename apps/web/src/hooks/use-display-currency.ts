import { getLocale } from "@/i18n/runtime";
import type { GetAccount } from "@/lib/functions/core";
import { currentAccountQuery } from "@/lib/queries/core";
import { DEFAULT_CURRENCY } from "@/lib/universal/schema/currency";
import { formatConvertedPrice } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * The currency prices are shown in, a converter from USD into it, and
 * formatters for amounts in either.
 */
export function useDisplayCurrency() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const { currency, rateToUsd } = displayCurrency(account);
  const format = (amount: number) =>
    formatConvertedPrice(amount, currency, getLocale());

  return {
    currency,
    rateToUsd,
    fromUsd: (usd: number) => usd / rateToUsd,
    format,
    formatUsd: (usd: number) => format(usd / rateToUsd),
  };
}

/**
 * The viewer's display currency and its USD rate. Signed out viewers and a
 * currency whose rate is missing fall back to USD.
 */
export function displayCurrency(account: GetAccount | null) {
  return account?.fxRateToUsd != null
    ? { currency: account.user.currency, rateToUsd: account.fxRateToUsd }
    : { currency: DEFAULT_CURRENCY, rateToUsd: 1 };
}

/**
 * The viewer's display currency, plus the rate that converts a sale list's
 * prices into it. The rate is null when they show as listed: the list already
 * uses that currency, or its own rate is missing.
 */
export function useSaleConversionRate(
  currency: string | null,
  fxRateToUsd: number | null,
) {
  const viewer = useDisplayCurrency();
  return {
    viewer,
    rate:
      currency === null || currency === viewer.currency ? null : fxRateToUsd,
  };
}
