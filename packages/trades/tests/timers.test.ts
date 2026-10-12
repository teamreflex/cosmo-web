import { describe, expect, test } from "bun:test";
import { claimCap } from "../src/caps";
import {
  CLAIM_WINDOW,
  EXTEND_HOURS,
  extendedDeadline,
  isTimedOut,
} from "../src/timers";

describe("isTimedOut (TIME-01)", () => {
  const deadline = new Date("2026-10-13T12:00:00Z");

  test.each([
    ["before the deadline", "2026-10-13T11:59:59.999Z", false],
    ["at the deadline", "2026-10-13T12:00:00Z", true],
    ["past the deadline", "2026-10-13T12:00:00.001Z", true],
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

describe("extendedDeadline", () => {
  const HOUR = 60 * 60 * 1000;
  const frozenAt = new Date("2026-10-10T08:00:00Z");
  const now = new Date("2026-10-12T15:30:00Z");

  test("keeps the time left when frozen and adds the extension (TIME-02)", () => {
    const deadline = new Date(frozenAt.getTime() + 31 * HOUR + 4 * 60 * 1000);
    expect(extendedDeadline(deadline, frozenAt, now, 48)).toEqual(
      new Date(now.getTime() + 79 * HOUR + 4 * 60 * 1000),
    );
  });

  test.each([24, 72] as const)(
    "counts no time left when frozen past the deadline, +%dh (TIME-03)",
    (hours) => {
      const deadline = new Date(frozenAt.getTime() - 2 * HOUR);
      expect(extendedDeadline(deadline, frozenAt, now, hours)).toEqual(
        new Date(now.getTime() + hours * HOUR),
      );
    },
  );

  test("adds each allowed extension to 10 hours left (TIME-04)", () => {
    const deadline = new Date(frozenAt.getTime() + 10 * HOUR);
    expect(
      EXTEND_HOURS.map(
        (hours) =>
          (extendedDeadline(deadline, frozenAt, now, hours).getTime() -
            now.getTime()) /
          HOUR,
      ),
    ).toEqual([34, 58, 82]);
  });
});
