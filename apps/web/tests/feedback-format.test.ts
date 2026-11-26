import { describe, expect, test } from "bun:test";
import {
  feedbackChipView,
  formatPercentPositive,
} from "../src/lib/universal/feedback";

// the share positive as the stats row's generated column computes it
const share = (positive: number, rated: number) => positive / rated;

describe("SCORE-17: percent formatting", () => {
  test.each([
    [1, 1, "100%"],
    [9999, 10000, "99.9%"],
    [29, 100, "29.0%"],
  ])("%i of %i positive reads %s", (positive, rated, expected) => {
    expect(formatPercentPositive(share(positive, rated), "en")).toBe(expected);
  });

  test("999 of 1000 positive reads 99% whole", () => {
    expect(formatPercentPositive(share(999, 1000), "en", 0)).toBe("99%");
  });
});

describe("profile chip view", () => {
  const summary = (positive: number, neutral: number, negative: number) => ({
    total: positive + neutral + negative,
    score: positive - negative,
    percent:
      positive + negative === 0 ? null : share(positive, positive + negative),
    counts: { positive, neutral, negative },
    roles: { buyer: 0, seller: 0, trader: 0 },
  });

  test("no rating shows nothing", () => {
    expect(feedbackChipView(summary(0, 0, 0))).toEqual({ kind: "none" });
  });

  test.each([
    [8, 0, 1, { kind: "counts", isNew: true }],
    [8, 1, 1, { kind: "counts", isNew: false }],
    [9, 0, 1, { kind: "percent" }],
    [0, 12, 0, { kind: "counts", isNew: false }],
  ])(
    "%i positive, %i neutral, %i negative reads as %o",
    (positive, neutral, negative, expected) => {
      expect(
        feedbackChipView(summary(positive, neutral, negative)),
      ).toMatchObject(expected);
    },
  );
});
