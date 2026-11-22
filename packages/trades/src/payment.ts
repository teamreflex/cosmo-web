import {
  type ListingOfferMode,
  type PaymentMethod,
  paymentMethods,
  type TradeSide,
} from "@apollo/database/web/types";
import { isDistinct } from "@apollo/util";
import * as z from "zod";

/**
 * The most one unit of a listing's payment can be, in minor units
 * (99,999,999.99). A claim takes at most MAX_TOTAL_WANTED units and a buy
 * listing asks for at most MAX_BUY_UNITS, so every total stays inside the
 * `numeric(14,2)` columns.
 */
export const MAX_PAYMENT_AMOUNT = 9_999_999_999;

/**
 * The largest value `numeric(14,2)` holds, in minor units.
 */
export const MAX_NUMERIC_AMOUNT = 99_999_999_999_999;

/**
 * How a listing's payment is priced: a fixed price claimed at once, an
 * asking price a claimer may also make an offer against, or no asking
 * price at all, so every claimer makes an offer. `amount` is per unit, in
 * minor units.
 */
export type PaymentPrice =
  | { mode: Exclude<ListingOfferMode, "offer_only">; amount: number }
  | { mode: "offer_only"; amount: null };

/**
 * A listing's payment: who sends it (`to` the claimer, or `from` the poster,
 * on top of their objekts or alone on a buy listing), how it is priced, its
 * currency and the methods it may arrive by. The claimer's payment and a
 * buy listing's take offers; the poster's on top of objekts is always a
 * fixed price.
 */
export type ListingPayment = {
  side: TradeSide;
  currency: string;
  methods: PaymentMethod[];
} & PaymentPrice;

/**
 * What a listing's payment shares across its options: who sends it, its
 * currency, the methods it may arrive by and its offer mode. Each option
 * that carries the payment has its own price (ListingPayment).
 */
export type PaymentTerms = {
  side: TradeSide;
  currency: string;
  methods: PaymentMethod[];
  mode: ListingOfferMode;
};

/**
 * A trade's payment: its amount for every unit the trade took, in minor
 * units, its currency and the side that sends it.
 */
export type TradePayment = {
  sender: TradeSide;
  amount: number;
  currency: string;
};

/**
 * Where a trade's payment stands: unpaid, marked paid by its sender
 * (`marked`, which settles nothing), or confirmed received by its
 * recipient, by one of the trade's methods, whether or not it was marked
 * first.
 */
export type PaymentProgress =
  | { stage: "unpaid" }
  | { stage: "marked"; at: Date }
  | { stage: "confirmed"; at: Date; method: PaymentMethod };

export type PaymentStage = PaymentProgress["stage"];

// a trade's payment item as stored, parsed (parsePaymentItem())
export type PaymentItem = TradePayment & {
  id: number;
  progress: PaymentProgress;
};

/**
 * A stored payment item (PaymentItem), its amount parsed from the
 * `numeric(14,2)` column into minor units. Throws on what the write paths
 * never produce: a payment without its amount or currency, which
 * `trade_offer_items_objekt_chk` forbids, or a confirmation without its
 * method, since `$confirmPayment` stamps the two together.
 */
export function parsePaymentItem(row: {
  id: number;
  sender: TradeSide;
  amount: string | null;
  currency: string | null;
  markedPaidAt: Date | null;
  confirmedAt: Date | null;
  method: PaymentMethod | null;
}): PaymentItem {
  if (row.amount === null || row.currency === null) {
    throw new Error(`payment item ${row.id} has no amount`);
  }
  const item = {
    id: row.id,
    sender: row.sender,
    amount: fromNumeric(row.amount),
    currency: row.currency,
  };
  if (row.confirmedAt !== null) {
    if (row.method === null) {
      throw new Error(`payment item ${row.id} is confirmed without a method`);
    }
    return {
      ...item,
      progress: { stage: "confirmed", at: row.confirmedAt, method: row.method },
    };
  }
  return {
    ...item,
    progress:
      row.markedPaidAt === null
        ? { stage: "unpaid" }
        : { stage: "marked", at: row.markedPaidAt },
  };
}

const decimalAmount = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * An amount as typed, at most two decimals, parsed into minor units: more
 * than 0 and at most MAX_PAYMENT_AMOUNT. Every currency takes two
 * decimals, KRW included.
 */
export const amountSchema = z
  .string()
  .trim()
  .regex(decimalAmount, "Enter an amount with at most two decimals")
  .transform((value) => {
    const [, whole = "0", fraction = ""] = decimalAmount.exec(value) ?? [];
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .refine((amount) => amount > 0, "An amount must be more than 0")
  .refine(
    (amount) => amount <= MAX_PAYMENT_AMOUNT,
    `An amount can be at most ${toNumeric(MAX_PAYMENT_AMOUNT)}`,
  );

/**
 * A currency code. Whether the site supports it is checked on the server
 * against the exchange rates it holds.
 */
export const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Pick a currency");

export const paymentMethodsSchema = z
  .array(z.enum(paymentMethods))
  .min(1, "Pick at least one payment method")
  .refine(isDistinct, {
    message: "Each payment method can only be picked once",
  });

// minor units as the `numeric(14,2)` columns take them
export function toNumeric(amount: number) {
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

const numericAmount = /^(\d+)\.(\d{2})$/;

/**
 * A `numeric(14,2)` value as Postgres returns it, in minor units. Throws on
 * anything else, which means the column and this parser drifted apart.
 */
export function fromNumeric(value: string) {
  const match = numericAmount.exec(value);
  if (match === null) throw new Error(`not a numeric(14,2) amount: ${value}`);
  const [, whole = "0", fraction = "0"] = match;
  return Number(whole) * 100 + Number(fraction);
}

/**
 * An amount as plain text where there is no viewer's locale, in emails and
 * staff's Discord: its currency's code and two decimals, "USD 12.50".
 */
export function formatPaymentText(amount: number, currency: string) {
  return formatPayment(amount, currency, "en-US", "code");
}

/**
 * An amount in its own currency with two decimals, KRW included, never
 * converted: both sides see the amount to pay.
 */
export function formatPayment(
  amount: number,
  currency: string,
  locale: string,
  currencyDisplay: "symbol" | "code" = "symbol",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
