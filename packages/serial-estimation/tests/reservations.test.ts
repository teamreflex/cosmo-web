import { describe, expect, it } from "bun:test";
import {
  RESERVATION_MIN_GAP,
  reservationSpans,
  splitReservation,
  tokenIdRanges,
  toReservation,
} from "../src";

describe("reserved ranges", () => {
  it("splits a token-id range wherever the digit count changes", () => {
    /**
     * Objekt ids are text, where "10000000" sorts below "9999999", so a scan
     * across the boundary needs one range per length.
     */
    expect(tokenIdRanges(9999998, 10000001)).toEqual([
      { from: 9999998, to: 9999999, digits: 7 },
      { from: 10000000, to: 10000001, digits: 8 },
    ]);
    // one id is a range of its own
    expect(tokenIdRanges(7, 7)).toEqual([{ from: 7, to: 7, digits: 1 }]);
    // a range that ends below its start holds no ids
    expect(tokenIdRanges(10000000, 9999999)).toEqual([]);
  });

  it("splits a stored range at the late mints inside it", () => {
    /**
     * 9999000 and 10001000 were minted first and opened the range between
     * them. 10000500 and 9999500 reach the chain afterwards, in that order,
     * and 10002000 lies outside it.
     */
    const range = { lo: 9999000, hi: 10001000 };
    expect(splitReservation(range, [10002000, 10000500, 9999500])).toEqual([
      { lo: 9999000, hi: 9999500 },
      { lo: 9999500, hi: 10000500 },
      { lo: 10000500, hi: 10001000 },
    ]);

    // a piece as wide as the minimum gap is a reservation, a narrower one isn't
    const atGap = range.lo + RESERVATION_MIN_GAP;
    expect(splitReservation(range, [atGap])).toEqual([
      { lo: range.lo, hi: atGap },
      { lo: atGap, hi: range.hi },
    ]);
    expect(splitReservation(range, [atGap - 1])).toEqual([
      { lo: atGap - 1, hi: range.hi },
    ]);
  });

  it("finds a collection's span in each range it has objekts in", () => {
    // 100, 400 and 950 are range bounds or beyond them, so they sit in no range
    expect(
      reservationSpans(
        [
          { lo: 100, hi: 400 },
          { lo: 400, hi: 900 },
        ],
        [650, 300, 100, 400, 200, 950, 600],
      ),
    ).toEqual([
      { lo: 400, hi: 900, min: 600, max: 650 },
      { lo: 100, hi: 400, min: 200, max: 300 },
    ]);
  });

  it("shares a range on any other collection's objekt in it, and counts as foreign only those between the collection's own", () => {
    // the collection holds 200-300 of the range 100-400
    const span = { lo: 100, hi: 400, min: 200, max: 300 };
    expect(toReservation(span, [], false, [])).toEqual({
      lo: 100,
      hi: 400,
      shared: false,
      foreign: [],
    });

    // stored outside the span
    expect(toReservation(span, [], true, [])).toMatchObject({
      shared: true,
      foreign: [],
    });
    // not stored yet, outside the span
    expect(toReservation(span, [], false, [350])).toMatchObject({
      shared: true,
      foreign: [],
    });
    // stored between its own
    expect(toReservation(span, [250], false, [])).toMatchObject({
      shared: true,
      foreign: [250],
    });
    // not stored yet, on the range's bounds
    expect(toReservation(span, [], false, [100, 400])).toMatchObject({
      shared: false,
      foreign: [],
    });
    // between its own, stored and not; 500 belongs to another range
    expect(toReservation(span, [250, 500], false, [260])).toMatchObject({
      shared: true,
      foreign: [250, 260],
    });
  });
});
