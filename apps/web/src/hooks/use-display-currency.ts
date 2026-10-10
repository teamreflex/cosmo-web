import { getLocale } from "@/i18n/runtime";
import { currentAccountQuery } from "@/lib/queries/core";
import { DEFAULT_CURRENCY } from "@/lib/universal/schema/currency";
import { formatConvertedPrice } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * The currency prices are shown in and a formatter from USD into it. Signed
 * out viewers, an unset currency and a currency whose rate is missing all
 * fall back to USD.
 */
export function useDisplayCurrency() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);

  const { currency, rate } =
    account?.user.currency != null && account.fxRateToUsd !== null
      ? { currency: account.user.currency, rate: account.fxRateToUsd }
      : { currency: DEFAULT_CURRENCY, rate: 1 };

  return {
    currency,
    formatUsd: (usd: number) =>
      formatConvertedPrice(usd / rate, currency, getLocale()),
  };
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
