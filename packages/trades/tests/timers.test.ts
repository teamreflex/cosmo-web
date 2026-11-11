import { describe, expect, test } from "bun:test";
import { extendedDeadline, isTimedOut } from "../src/timers";

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

  test("counts no time left when frozen past the deadline, +24h (TIME-03)", () => {
    const deadline = new Date(frozenAt.getTime() - 2 * HOUR);
    expect(extendedDeadline(deadline, frozenAt, now, 24)).toEqual(
      new Date(now.getTime() + 24 * HOUR),
    );
  });
});
