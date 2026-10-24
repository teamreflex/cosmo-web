import * as z from "zod";

export const DEFAULT_CURRENCY = "USD";

/**
 * Quick picks on currency inputs, ordered by how many sale lists use each.
 */
export const commonCurrencies = [
  "USD",
  "KRW",
  "JPY",
  "TWD",
  "EUR",
  "THB",
  "CNY",
  "IDR",
  "GBP",
  "SGD",
] as const;

/**
 * Shape check only: server functions confirm the code has an `fx_rates` row.
 */
export const currencySchema = z
  .string()
  .length(3, "Currency must be 3 characters")
  .transform((v) => v.toUpperCase());
