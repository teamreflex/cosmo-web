import { describe, expect, test } from "bun:test";
import {
  formatPayment,
  fromNumeric,
  MAX_NUMERIC_AMOUNT,
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
});
