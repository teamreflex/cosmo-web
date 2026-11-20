import { describe, expect, test } from "bun:test";
import { owedAtDeadline } from "../src/lib/client/trade-listings";

const objekt = (status: "sent" | "waiting") => ({ status });
const payment = (status: "confirmed" | "waiting") => ({ status });

/**
 * A deadline dispute's wording follows what is owed; a trade without a
 * payment always reads as objekts owed, main's wording.
 */
describe("owedAtDeadline", () => {
  test.each([
    [
      "a swap with one side unsent",
      [objekt("sent"), objekt("waiting")],
      null,
      "objekts",
    ],
    [
      "a sale with the objekt sent",
      [objekt("sent")],
      payment("waiting"),
      "payment",
    ],
    [
      "a sale with the payment confirmed",
      [objekt("waiting")],
      payment("confirmed"),
      "objekts",
    ],
    ["both still owed", [objekt("waiting")], payment("waiting"), "both"],
  ] as const)("%s", (_, items, owedPayment, expected) => {
    expect(owedAtDeadline({ items, payment: owedPayment })).toBe(expected);
  });
});
