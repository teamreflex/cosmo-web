import { describe, expect, it } from "bun:test";
import { buildCalendar } from "../src/lib/universal/como";
import { userObjekts } from "./fixtures/como-objekts";

// Sums per-artist count across all days for a given calendar.
function totals(cal: ReturnType<typeof buildCalendar>) {
  const out: Record<number, number> = {};
  for (const [day, artists] of Object.entries(cal)) {
    out[Number(day)] = Object.values(artists).reduce(
      (s, a) => s + (a?.count ?? 0),
      0,
    );
  }
  return out;
}

// Sums per-artist carried across all days for a given calendar.
function carried(cal: ReturnType<typeof buildCalendar>) {
  const out: Record<number, number> = {};
  for (const [day, artists] of Object.entries(cal)) {
    const c = Object.values(artists).reduce((s, a) => s + (a?.carried ?? 0), 0);
    if (c > 0) out[Number(day)] = c;
  }
  return out;
}

describe("buildCalendar", () => {
  // baseline expected COMO totals per UTC day-of-mint, derived from the
  // user's owned Special/Premier holdings. These match what COSMO displays.
  const expectedByUtcDay: Record<number, number> = {
    1: 10,
    2: 15,
    3: 10,
    4: 15,
    5: 7,
    6: 4,
    7: 13,
    9: 2,
    10: 5,
    11: 5,
    12: 82,
    14: 4,
    15: 3,
    16: 10,
    17: 4,
    18: 4,
    19: 7,
    20: 2,
    21: 8,
    22: 10,
    23: 10,
    24: 19,
    25: 5,
    26: 18,
    27: 12,
    28: 6,
    29: 16,
    30: 6,
    31: 7,
  };

  it("groups objekts by UTC day of mint, not viewer-local day", () => {
    // May 2026 has 31 days, so no carryover should occur.
    const cal = buildCalendar(new Date("2026-05-09T00:00:00Z"), userObjekts);
    expect(totals(cal)).toEqual(expectedByUtcDay);
    expect(carried(cal)).toEqual({});
  });

  it("produces identical results regardless of viewer timezone", () => {
    // The same wall-clock moment, expressed in different zones — the calendar
    // must not shift days based on where the viewer happens to be.
    const utc = buildCalendar(new Date("2026-05-09T00:00:00Z"), userObjekts);
    const nzt = buildCalendar(
      new Date("2026-05-09T12:00:00+12:00"),
      userObjekts,
    );
    const pst = buildCalendar(
      new Date("2026-05-08T16:00:00-08:00"),
      userObjekts,
    );

    expect(totals(nzt)).toEqual(totals(utc));
    expect(totals(pst)).toEqual(totals(utc));
  });

  it("places UTC-late-day mints on the correct cell (regression: NZT off-by-one)", () => {
    // 2024-12-04T23:28:05Z is UTC day 4. In NZT (+13 with DST) it would be
    // day 5. The fix anchors on UTC, so these belong on day 4.
    const dec4Mints = userObjekts.filter(
      (o) => o.mintedAt === "2024-12-04T23:28:05Z",
    );
    expect(dec4Mints).toHaveLength(4);

    const cal = buildCalendar(new Date("2026-05-09T00:00:00Z"), userObjekts);
    // day 4 total includes those 4 December mints; day 5 must not absorb them
    expect(cal[4]?.artms?.count).toBe(15);
    expect(cal[5]?.artms?.count).toBe(7);
  });

  it("carries day-31 mints over to day 30 in 30-day months", () => {
    // April 2026: day 31 doesn't exist, so the 7 COMO from day-31 mints
    // (5 Specials + 1 Premier@2) should land on day 30 alongside the 6 native
    // day-30 mints, totalling 13 COMO with carried=7.
    const cal = buildCalendar(new Date("2026-04-15T00:00:00Z"), userObjekts);

    expect(cal[30]?.artms?.count).toBe(13);
    expect(cal[30]?.artms?.carried).toBe(7);
    expect(cal[31]).toBeUndefined();
  });

  it("collapses days 29-31 onto day 28 in February", () => {
    // Feb 2026 (non-leap): day 29 (16) + day 30 (6) + day 31 (7) all carry
    // over to day 28, summed with day 28's own 6 → 35 COMO, carried=29.
    const cal = buildCalendar(new Date("2026-02-15T00:00:00Z"), userObjekts);

    expect(cal[28]?.artms?.count).toBe(35);
    expect(cal[28]?.artms?.carried).toBe(29);
    expect(cal[29]).toBeUndefined();
    expect(cal[30]).toBeUndefined();
    expect(cal[31]).toBeUndefined();
  });

  it("preserves day 29 in leap-year February", () => {
    // Feb 2024 had 29 days. Day 30/31 carry to 29; day 29's own 16 stays put.
    const cal = buildCalendar(new Date("2024-02-15T00:00:00Z"), userObjekts);

    expect(cal[29]?.artms?.count).toBe(29); // 16 + 6 + 7
    expect(cal[29]?.artms?.carried).toBe(13); // 6 + 7
    expect(cal[30]).toBeUndefined();
    expect(cal[31]).toBeUndefined();
  });

  it("counts Premier objekts as 2 COMO per drop", () => {
    // Three Premiers in the fixture: day 1 (Jun '25), day 18 (Dec '25),
    // day 31 (Jan '25). Each contributes 2 COMO to its UTC day.
    const cal = buildCalendar(new Date("2026-05-09T00:00:00Z"), userObjekts);

    // day 1: 8 Specials + 1 Premier (2) = 10
    expect(cal[1]?.artms?.count).toBe(10);
    // day 18: 2 Specials + 1 Premier (2) = 4
    expect(cal[18]?.artms?.count).toBe(4);
    // day 31: 5 Specials + 1 Premier (2) = 7
    expect(cal[31]?.artms?.count).toBe(7);
  });

  it("returns an empty calendar when the owner holds nothing", () => {
    const cal = buildCalendar(new Date("2026-05-09T00:00:00Z"), []);
    expect(cal).toEqual({});
  });
});
