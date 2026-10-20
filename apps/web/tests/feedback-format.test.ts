import { describe, expect, test } from "bun:test";
import { formatPercentPositive } from "../src/lib/universal/feedback";

// the share positive as the stats row's generated column computes it
const share = (positive: number, rated: number) => positive / rated;

describe("SCORE-17: percent formatting", () => {
  test.each([
    [1, 1, "100%"],
    [999, 1000, "99.9%"],
    [9999, 10000, "99.9%"],
    [49, 50, "98.0%"],
    [24, 25, "96.0%"],
    [1, 3, "33.3%"],
    [0, 2, "0.0%"],
    [228, 230, "99.1%"],
    [29, 100, "29.0%"],
  ])("%i of %i positive reads %s", (positive, rated, expected) => {
    expect(formatPercentPositive(share(positive, rated), "en")).toBe(expected);
  });

  test("only exactly all positive reads a bare 100, never 100.0%", () => {
    for (let rated = 1; rated <= 2000; rated++) {
      const text = formatPercentPositive(share(rated - 1, rated), "en");
      expect(text).not.toBe("100%");
      expect(text).not.toBe("100.0%");
      expect(formatPercentPositive(share(rated, rated), "en")).toBe("100%");
    }
  });

  test.each([
    [1, 1, "100%"],
    [999, 1000, "99%"],
    [87, 89, "97%"],
    [0, 2, "0%"],
  ])("%i of %i positive reads %s whole", (positive, rated, expected) => {
    expect(formatPercentPositive(share(positive, rated), "en", 0)).toBe(
      expected,
    );
  });

  // about 80k formats, so it outlasts bun's 5 s default on a busy machine
  test("the cut never rounds up across every share up to 400 ratings", () => {
    for (let rated = 1; rated <= 400; rated++) {
      for (let positive = 0; positive <= rated; positive++) {
        const permille = Math.floor((positive * 1000) / rated);
        expect(formatPercentPositive(share(positive, rated), "en")).toBe(
          permille === 1000
            ? "100%"
            : `${Math.floor(permille / 10)}.${permille % 10}%`,
        );
      }
    }
  }, 30_000);
});

test.each([
  ["en", ["99.9%", "98.0%", "100%"]],
  ["fr", ["99,9 %", "98,0 %", "100 %"]],
  ["ja", ["99.9%", "98.0%", "100%"]],
  ["ko", ["99.9%", "98.0%", "100%"]],
])(
  "I18N-02: %s cuts the percent in its own number format",
  (locale, percents) => {
    expect(
      [share(999, 1000), share(49, 50), share(1, 1)].map((percent) =>
        formatPercentPositive(percent, locale),
      ),
    ).toEqual(percents);
  },
);
