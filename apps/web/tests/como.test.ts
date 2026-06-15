import { describe, expect, it } from "bun:test";
import { buildCalendar } from "../src/lib/universal/como";
import { gmt7UserObjekts, nztUserObjekts } from "./fixtures/como-objekts";

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
  describe("system-TZ agnostic", () => {
    it("produces identical output across host TZs", () => {
      // The algorithm must not leak the system's local TZ into its output —
      // a previous regression had `getDaysInMonth` reading in local time,
      // producing a phantom carry for negative-GMT browsers.
      const originalTz = process.env.TZ;

      function buildIn(tz: string) {
        process.env.TZ = tz;
        // Date constructions happen here so they pick up the new TZ
        return buildCalendar(
          new Date("2026-05-15T12:00:00Z"),
          gmt7UserObjekts,
          "America/Los_Angeles",
        );
      }

      try {
        const utc = buildIn("UTC");
        const la = buildIn("America/Los_Angeles");
        const nz = buildIn("Pacific/Auckland");
        const ny = buildIn("America/New_York");

        expect(la).toEqual(utc);
        expect(nz).toEqual(utc);
        expect(ny).toEqual(utc);
      } finally {
        if (originalTz === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTz;
        }
      }
    });
  });

  describe("NZT", () => {
    // COMO totals per day in May 2026 for the fixture owner, verified against
    // their COSMO calendar. May has 31 days, so day-31 mints land natively on
    // the 31st and no carryover occurs. Days 1 and 28 read 10/6 here (the
    // indexer mint-day anchoring) vs COSMO's 9/7 — one Special that COSMO
    // anchors a day later; a known 1-COMO quirk we don't replicate.
    const expectedByDay: Record<number, number> = {
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
      27: 13,
      28: 6,
      29: 16,
      30: 6,
      31: 7,
    };

    it("groups objekts by viewer-local day of the drop event", () => {
      // May 2026 has 31 days, so no carryover should occur.
      const cal = buildCalendar(
        new Date("2026-05-09T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );
      expect(totals(cal)).toEqual(expectedByDay);
      expect(carried(cal)).toEqual({});
    });

    it("places mints on the correct cell (regression)", () => {
      // 2024-12-04T23:28:05Z is UTC day 4. A naive `getDate()` on the raw
      // mintedAt would push it to day 5 in NZ; anchoring on the 00:00 UTC
      // drop event keeps it on day 4 where COSMO shows it.
      const dec4Mints = nztUserObjekts.filter(
        (o) => o.mintedAt === "2024-12-04T23:28:05Z",
      );
      expect(dec4Mints).toHaveLength(4);

      const cal = buildCalendar(
        new Date("2026-05-09T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );
      // day 4 includes those 4 December mints; day 5 must not absorb them
      expect(cal[4]?.artms?.count).toBe(15);
      expect(cal[5]?.artms?.count).toBe(7);
    });

    it("renders the full April calendar with day-31 mints capped onto day 30", () => {
      // April mirrors May's day-by-day distribution, with one difference:
      // April has no 31st, so the 7 COMO from day-31 mints (5 Specials + 1
      // Premier@2) cap onto day 30 — 6 native + 7 = 13, carried 7 — and day
      // 31 is absent. Verified against COSMO, which renders April 30 as
      // "11+2" (the same Premier that sits on day 31 in May). Days 24/25/27
      // read higher than COSMO's April here because the calendar is
      // forward-looking: it projects current holdings across the whole month
      // regardless of when each objekt was received.
      const aprilExpectedByDay: Record<number, number> = {
        ...expectedByDay,
        30: 13,
      };
      delete aprilExpectedByDay[31];

      const cal = buildCalendar(
        new Date("2026-04-15T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );

      expect(totals(cal)).toEqual(aprilExpectedByDay);
      expect(carried(cal)).toEqual({ 30: 7 });
      expect(cal[31]).toBeUndefined();
    });

    it("collapses days 29-31 in February (non-leap)", () => {
      // Feb 2026 (non-leap): day 29 (16) + day 30 (6) + day 31 (7) all
      // carry to day 28, summed with day 28's own 6 -> 35 COMO, carried=29.
      const cal = buildCalendar(
        new Date("2026-02-15T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );

      expect(cal[28]?.artms?.count).toBe(35);
      expect(cal[28]?.artms?.carried).toBe(29);
      expect(cal[29]).toBeUndefined();
      expect(cal[30]).toBeUndefined();
      expect(cal[31]).toBeUndefined();
    });

    it("handles leap-year February", () => {
      // Feb 2024 had 29 days. Day 30/31 carry to 29; day 29's own 16 stays put.
      const cal = buildCalendar(
        new Date("2024-02-15T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );

      expect(cal[29]?.artms?.count).toBe(29); // 16 + 6 + 7
      expect(cal[29]?.artms?.carried).toBe(13); // 6 + 7
      expect(cal[30]).toBeUndefined();
      expect(cal[31]).toBeUndefined();
    });

    it("counts Premier objekts as 2 COMO per drop", () => {
      // Three Premiers in the fixture: UTC day 1 (Jun '25), day 18 (Dec
      // '25), day 31 (Jan '25). Each contributes 2 COMO to its UTC day.
      const cal = buildCalendar(
        new Date("2026-05-09T00:00:00Z"),
        nztUserObjekts,
        "Pacific/Auckland",
      );

      // day 1: 8 Specials + 1 Premier (2) = 10
      expect(cal[1]?.artms?.count).toBe(10);
      // day 18: 2 Specials + 1 Premier (2) = 4
      expect(cal[18]?.artms?.count).toBe(4);
      // day 31: 5 Specials + 1 Premier (2) = 7
      expect(cal[31]?.artms?.count).toBe(7);
    });

    it("returns an empty calendar when the owner holds nothing", () => {
      const cal = buildCalendar(
        new Date("2026-05-09T00:00:00Z"),
        [],
        "Pacific/Auckland",
      );
      expect(cal).toEqual({});
    });
  });

  describe("GMT-7", () => {
    // baseline COMO totals per day in May 2026 as displayed by COSMO for
    // the GMT-7 user. 00:00 UTC drops land at 17:00 the previous local
    // day (PDT -7), so UTC day D drops on local day D-1; UTC day 1 wraps
    // onto the local month's last day via the next UTC month's drop.
    // Days 1-22 are user-verified; days 23-31 are model-predicted.
    const expectedByDay: Record<number, number> = {
      1: 5,
      2: 6,
      3: 2,
      4: 2,
      5: 1,
      6: 7,
      8: 1,
      9: 4,
      10: 4,
      11: 1,
      12: 3,
      13: 4,
      14: 2,
      15: 1,
      16: 1,
      17: 1,
      18: 2,
      19: 1,
      20: 0,
      21: 1,
      22: 3,
    };

    it("groups objekts by viewer-local day of the drop event", () => {
      // May 2026 has 31 days, so no UTC-month carryover should occur.
      const cal = buildCalendar(
        new Date("2026-05-15T12:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );
      const cosmo = totals(cal);
      for (const [day, expected] of Object.entries(expectedByDay)) {
        expect(cosmo[Number(day)] ?? 0).toBe(expected);
      }
      expect(carried(cal)).toEqual({});
    });

    it("places mints on the correct cell (regression)", () => {
      // 2023-07-04T12:xx:xxZ is UTC day 4 at mid-day; a naive `getDate()`
      // on the raw mintedAt in GMT-7 keeps the local date as day 4. The
      // drop event (00:00 UTC = 17:00 prev local day) belongs on day 3.
      const day4Mints = gmt7UserObjekts.filter((o) =>
        o.mintedAt.startsWith("2023-07-04T12:"),
      );
      expect(day4Mints).toHaveLength(2);

      const cal = buildCalendar(
        new Date("2026-05-15T12:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );
      // day 3 holds the 2 July UTC-day-4 mints; day 4 holds UTC-day-5 mints
      expect(cal[3]?.artms?.count).toBe(2);
      expect(cal[4]?.artms?.count).toBe(2);
    });

    it("carries day-31 mints in 30-day months", () => {
      // April 2026: the capped day-31 drop's count lands on local day 29 (the
      // 00:00 UTC drop shifts a day earlier in GMT-7), but the carried-over
      // badge belongs on the month's last local day (30). The next UTC month's
      // day-1 drop (May 1 UTC = Apr 30 local) wraps onto day 30.
      const cal = buildCalendar(
        new Date("2026-04-15T00:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );

      // day 29: 2 UTC-day-30 + 1 Premier@2 capped from UTC-day-31 = 4
      expect(cal[29]?.artms?.count).toBe(4);
      expect(cal[29]?.artms?.carried).toBe(0);
      // day 30: UTC-day-1 wrap (count 4); carries the Premier@2 badge for the month
      expect(cal[30]?.artms?.count).toBe(4);
      expect(cal[30]?.artms?.carried).toBe(2);
      expect(cal[31]).toBeUndefined();
    });

    it("collapses days 29-31 in February (non-leap)", () => {
      // Feb 2026 (non-leap): UTC days 29/30/31 all carry to UTC day 28,
      // their counts landing on local day 27 alongside the native UTC-day-28
      // mint. UTC day 1 from the next UTC month wraps onto local day 28 — the
      // month's last local day, where the carried-over badge belongs.
      const cal = buildCalendar(
        new Date("2026-02-15T00:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );

      // day 27: 1 native (UTC 28) + 6 (UTC 29) + 2 (UTC 30) + Premier@2
      // (UTC 31) = 11
      expect(cal[27]?.artms?.count).toBe(11);
      expect(cal[27]?.artms?.carried).toBe(0);
      // day 28: UTC-day-1 wrap (count 4); carries the month's badge (6+2+2=10)
      expect(cal[28]?.artms?.count).toBe(4);
      expect(cal[28]?.artms?.carried).toBe(10);
      expect(cal[29]).toBeUndefined();
      expect(cal[30]).toBeUndefined();
      expect(cal[31]).toBeUndefined();
    });

    it("handles leap-year February", () => {
      // Feb 2024 had 29 days. UTC day 29 lands on local day 28; UTC days 30/31
      // carry to UTC 29 and their counts also land on local day 28. The extra
      // leap day (local 29) catches the UTC-day-1 wrap from Mar and is the
      // last local day, so it carries the badge.
      const cal = buildCalendar(
        new Date("2024-02-15T00:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );

      // day 28: 6 (UTC 29) + 2 (UTC 30) + 2 (Premier UTC 31) = 10
      expect(cal[28]?.artms?.count).toBe(10);
      expect(cal[28]?.artms?.carried).toBe(0);
      // day 29: UTC-day-1 wrap (count 4); carries the month's badge (2+2=4)
      expect(cal[29]?.artms?.count).toBe(4);
      expect(cal[29]?.artms?.carried).toBe(4);
      expect(cal[30]).toBeUndefined();
      expect(cal[31]).toBeUndefined();
    });

    it("counts Premier objekts as 2 COMO per drop", () => {
      // Three Premiers in the fixture: UTC day 31 (Jan '25), UTC day 1
      // (Jun '25), UTC day 24 (Jan '26). In May they land on day 30,
      // day 31 (wrap), and day 23 respectively.
      const cal = buildCalendar(
        new Date("2026-05-15T12:00:00Z"),
        gmt7UserObjekts,
        "America/Los_Angeles",
      );

      // day 23: 5 Specials + 1 Premier (2) = 7
      expect(cal[23]?.artms?.count).toBe(7);
      // day 30: only the Premier = 2
      expect(cal[30]?.artms?.count).toBe(2);
      // day 31: 2 Specials + 1 Premier (2) = 4
      expect(cal[31]?.artms?.count).toBe(4);
    });

    it("returns an empty calendar when the owner holds nothing", () => {
      const cal = buildCalendar(
        new Date("2026-05-09T00:00:00Z"),
        [],
        "America/Los_Angeles",
      );
      expect(cal).toEqual({});
    });
  });
});
