import { describe, expect, test } from "bun:test";
import { formatPercentPositive } from "../src/lib/universal/feedback";

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
