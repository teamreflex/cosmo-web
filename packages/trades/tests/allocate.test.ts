import { describe, expect, test } from "bun:test";
import {
  allocate,
  allocateUnits,
  fillsExactly,
  type InventoryObjekt,
  listingOfferRefusal,
  type OfferedToken,
  type TradeWant,
  unitsOf,
} from "../src/allocate";
import { MAX_PER_ROW, MAX_TOTAL_WANTED } from "../src/caps";
import type { RangeFilter } from "../src/range";

let nextTokenId = 1;

function objekt(
  season: string,
  member: string,
  collectionNo: string,
): InventoryObjekt {
  return {
    tokenId: nextTokenId++,
    slug: `${season}-${member}-${collectionNo}`.toLowerCase(),
    artist: "artms",
    member,
    collectionNo,
    season,
    class: collectionNo.startsWith("1") ? "First" : "Double",
    onOffline: collectionNo.endsWith("Z") ? "online" : "offline",
  };
}

function range(count: number, filter: Partial<RangeFilter>): TradeWant {
  return {
    kind: "range",
    count,
    ranges: [
      {
        artist: [],
        member: [],
        collectionNo: [],
        season: [],
        class: [],
        on_offline: [],
        ...filter,
      },
    ],
  };
}

function exact(count: number, slug: string): TradeWant {
  return { kind: "exact", count, slug };
}

function choice(count: number, slugs: string[]): TradeWant {
  return { kind: "choice", count, slugs };
}

describe("allocate", () => {
  test("a choice row takes any mix of its collections, copies included", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const heejinAgain = objekt("Atom01", "HeeJin", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const haseul = objekt("Atom01", "HaSeul", "101Z");
    const wants = [choice(3, ["atom01-heejin-101z", "atom01-kimlip-101z"])];

    expect(allocate(wants, [heejin, haseul, kimlip, heejinAgain])).toEqual([
      {
        tokenIds: [heejin.tokenId, kimlip.tokenId, heejinAgain.tokenId],
        missing: 0,
      },
    ]);
  });

  test("moves tokens between a range and a choice row to cover both", () => {
    /**
     * Both rows have two candidates, so the choice row goes first and takes
     * HeeJin, which the range needs beside KimLip.
     */
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const haseul = objekt("Atom01", "HaSeul", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      choice(1, ["atom01-heejin-101z", "atom01-haseul-101z"]),
      range(2, { member: ["HeeJin", "KimLip"] }),
    ];

    expect(allocate(wants, [heejin, haseul, kimlip])).toEqual([
      { tokenIds: [haseul.tokenId], missing: 0 },
      { tokenIds: [heejin.tokenId, kimlip.tokenId], missing: 0 },
    ]);
  });
});

describe("allocateUnits", () => {
  const firsts = (count: number) =>
    Array.from({ length: count }, () => objekt("Atom01", "HaSeul", "101Z"));
  const wants = [range(1, { member: ["HaSeul"] })];

  test("takes as many units as the inventory fills", () => {
    const inventory = firsts(3);
    expect(allocateUnits(wants, inventory, { free: 8, unitSize: 1 })).toEqual({
      units: 3,
      allocation: [{ tokenIds: inventory.map((o) => o.tokenId), missing: 0 }],
    });
  });

  test("stops at the per-row cap on the scaled row", () => {
    const inventory = firsts(MAX_PER_ROW + 2);
    expect(
      allocateUnits([range(2, { member: ["HaSeul"] })], inventory, {
        free: 20,
        unitSize: 1,
      }).units,
    ).toBe(Math.floor(MAX_PER_ROW / 2));
  });

  test("stops at the total cap across rows", () => {
    const inventory = [
      ...firsts(MAX_TOTAL_WANTED),
      ...Array.from({ length: MAX_TOTAL_WANTED }, () =>
        objekt("Atom01", "HeeJin", "101Z"),
      ),
    ];
    const both = [
      range(1, { member: ["HaSeul"] }),
      exact(1, "atom01-heejin-101z"),
    ];
    expect(
      allocateUnits(both, inventory, { free: 20, unitSize: 1 }).units,
    ).toBe(MAX_TOTAL_WANTED / 2);
  });

  test("is 0 with one unit's shortfall when nothing fills", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    expect(
      allocateUnits([exact(2, "atom01-heejin-101z")], [heejin], {
        free: 4,
        unitSize: 1,
      }),
    ).toEqual({
      units: 0,
      allocation: [{ tokenIds: [heejin.tokenId], missing: 1 }],
    });
  });

  test("is 0 when the free pool can't make a unit", () => {
    expect(
      allocateUnits(wants, firsts(2), { free: 1, unitSize: 2 }),
    ).toMatchObject({ units: 0 });
  });
});

describe("unitsOf", () => {
  test.each([
    ["several units", 6, 2, 3],
    ["a count between units", 5, 2, null],
  ] satisfies [string, number, number, number | null][])(
    "%s",
    (_, picked, unitSize, expected) => {
      expect(unitsOf(picked, unitSize)).toBe(expected);
    },
  );
});

describe("fillsExactly", () => {
  const kimlip = "atom01-kimlip-101z";
  const kimlips = (count: number) =>
    Array.from({ length: count }, () => objekt("Atom01", "KimLip", "101Z"));

  test("a token too many doesn't", () => {
    expect(fillsExactly([exact(2, kimlip)], kimlips(3))).toBe(false);
  });

  test("tokens that leave a row unfilled don't", () => {
    const wants = [
      range(1, { member: ["HeeJin", "KimLip"] }),
      choice(1, ["atom01-heejin-101z", "atom01-haseul-101z"]),
    ];
    expect(fillsExactly(wants, kimlips(2))).toBe(false);
  });
});

describe("listingOfferRefusal", () => {
  const kimlip = "atom01-kimlip-101z";
  const found = (token: InventoryObjekt): OfferedToken => ({
    kind: "found",
    ...token,
  });
  const kimlips = (count: number) =>
    Array.from({ length: count }, () =>
      found(objekt("Atom01", "KimLip", "101Z")),
    );
  // a listing of four pool objekts in units of two, for two KimLip 101Z a unit
  const listing = {
    pool: new Set([101, 102, 103, 104]),
    unitSize: 2,
    wants: [exact(2, kimlip)],
  };

  test("several units fit with every row scaled to them", () => {
    expect(
      listingOfferRefusal(
        { picks: [101, 102, 103, 104], given: kimlips(4) },
        listing,
      ),
    ).toBeNull();
    expect(
      listingOfferRefusal(
        { picks: [101, 102, 103, 104], given: kimlips(2) },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });

  test("picks that are no longer whole units change the terms", () => {
    expect(
      listingOfferRefusal(
        { picks: [101, 102], given: kimlips(2) },
        { ...listing, unitSize: 3 },
      ),
    ).toEqual({ reason: "terms_changed" });
  });

  test("a token the indexer doesn't know is named, not read as the terms", () => {
    expect(
      listingOfferRefusal(
        {
          picks: [101, 102],
          given: [...kimlips(1), { kind: "missing", tokenId: 9001 }],
        },
        listing,
      ),
    ).toEqual({ reason: "token_missing", tokenId: 9001 });
  });

  test("the terms are judged before the claimer's tokens", () => {
    expect(
      listingOfferRefusal(
        { picks: [101, 105], given: [{ kind: "missing", tokenId: 9001 }] },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });
});
