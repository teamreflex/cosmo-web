import { describe, expect, test } from "bun:test";
import { claimCap } from "../src/caps";
import { CLAIM_WINDOW, isTimedOut } from "../src/timers";

describe("isTimedOut", () => {
  const deadline = new Date("2026-10-13T12:00:00Z");

  test.each([
    ["before the deadline", "2026-10-13T11:59:59Z", false],
    ["at the deadline", "2026-10-13T12:00:00Z", true],
    ["past the deadline", "2026-10-13T12:00:01Z", true],
  ])("with the watermark %s", (_, watermark, expected) => {
    expect(isTimedOut(deadline, new Date(watermark))).toBe(expected);
  });

  test("never times out before the drain records a watermark", () => {
    expect(isTimedOut(deadline, null)).toBe(false);
  });
});

describe("claimCap", () => {
  test("is 3 for everyone until feedback exists", () => {
    expect(claimCap({ positive: 0, abandoned: 0 })).toBe(3);
    expect(claimCap({ positive: 40, abandoned: 2 })).toBe(3);
  });
});

describe("CLAIM_WINDOW (LTR-02)", () => {
  test("is exactly 48 hours", () => {
    expect(CLAIM_WINDOW).toBe(172_800_000);
    expect(
      new Date(Date.UTC(2026, 9, 11, 12) + CLAIM_WINDOW).toISOString(),
    ).toBe("2026-10-13T12:00:00.000Z");
  });
});
