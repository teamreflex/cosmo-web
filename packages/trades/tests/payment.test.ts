import { describe, expect, test } from "bun:test";
import {
  formatPayment,
  formatPaymentText,
  fromNumeric,
  MAX_NUMERIC_AMOUNT,
  parsePaymentItem,
  type PaymentProgress,
  toNumeric,
} from "../src/payment";

describe("numeric(14,2) amounts", () => {
  test.each([
    [1, "0.01"],
    [300, "3.00"],
    [250, "2.50"],
    [MAX_NUMERIC_AMOUNT, "999999999999.99"],
  ])("%d minor units round-trip as %s", (amount, numeric) => {
    expect(toNumeric(amount)).toBe(numeric);
    expect(fromNumeric(numeric)).toBe(amount);
  });

  test("refuses a value the column can't hold", () => {
    expect(() => fromNumeric("3")).toThrow();
    expect(() => fromNumeric("-3.00")).toThrow();
  });
});

test("formats every currency with two decimals, KRW included", () => {
  expect(formatPayment(300, "USD", "en-US")).toBe("$3.00");
  expect(formatPayment(500_000, "KRW", "en-US", "code")).toBe(
    "KRW\u00a05,000.00",
  );
  // plain text for emails and Discord names the currency by its code
  expect(formatPaymentText(1250, "USD")).toBe("USD\u00a012.50");
});

describe("parsePaymentItem", () => {
  const at = new Date("2026-11-21T00:00:00Z");
  const later = new Date("2026-11-21T01:00:00Z");
  const row = {
    id: 7,
    sender: "to",
    amount: "3.00",
    currency: "USD",
    markedPaidAt: null,
    confirmedAt: null,
    method: null,
  } as const;

  test.each([
    ["unpaid", {}, { stage: "unpaid" }],
    ["marked paid", { markedPaidAt: at }, { stage: "marked", at }],
    [
      "confirmed without a mark",
      { confirmedAt: later, method: "wise" },
      { stage: "confirmed", at: later, method: "wise" },
    ],
    [
      "confirmed after a mark",
      { markedPaidAt: at, confirmedAt: later, method: "wise" },
      { stage: "confirmed", at: later, method: "wise" },
    ],
  ] satisfies [
    string,
    Partial<Parameters<typeof parsePaymentItem>[0]>,
    PaymentProgress,
  ][])("a payment %s", (_, stamps, progress) => {
    expect(parsePaymentItem({ ...row, ...stamps })).toEqual({
      id: 7,
      sender: "to",
      amount: 300,
      currency: "USD",
      progress,
    });
  });

  test("throws on a row the write paths never produce", () => {
    expect(() => parsePaymentItem({ ...row, amount: null })).toThrow();
    expect(() => parsePaymentItem({ ...row, currency: null })).toThrow();
    expect(() => parsePaymentItem({ ...row, confirmedAt: at })).toThrow();
  });
});
