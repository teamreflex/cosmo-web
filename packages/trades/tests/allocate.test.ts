import { describe, expect, test } from "bun:test";
import {
  allocate,
  allocateUnits,
  type InventoryObjekt,
  isFullyAllocated,
  scaleWants,
  type TradeWant,
} from "../src/allocate";
import { MAX_PER_ROW, MAX_TOTAL_WANTED } from "../src/caps";
import type { RangeFilter } from "../src/range";

let nextTokenId = 1;

function objekt(
  season: string,
  member: string,
  collectionNo: string,
  overrides: Partial<InventoryObjekt> = {},
): InventoryObjekt {
  return {
    tokenId: nextTokenId++,
    slug: `${season}-${member}-${collectionNo}`.toLowerCase(),
    artist: "artms",
    member,
    season,
    class: collectionNo.startsWith("1") ? "First" : "Double",
    onOffline: collectionNo.endsWith("Z") ? "online" : "offline",
    ...overrides,
  };
}

function range(count: number, filter: Partial<RangeFilter>): TradeWant {
  return {
    kind: "range",
    count,
    filter: {
      artist: [],
      member: [],
      season: [],
      class: [],
      on_offline: [],
      ...filter,
    },
  };
}

function exact(count: number, slug: string): TradeWant {
  return { kind: "exact", count, slug };
}

function choice(count: number, slugs: string[]): TradeWant {
  return { kind: "choice", count, slugs };
}

describe("allocate", () => {
  test("covers the plan's example listing", () => {
    // 5× Atom02 · ARTMS · First + 1× KimLip 201Z
    const firsts = [
      "HeeJin",
      "HaSeul",
      "JinSoul",
      "Choerry",
      "YeoJin",
      "ViVi",
    ].map((member) => objekt("Atom02", member, "101Z"));
    const kimlip = objekt("Atom02", "KimLip", "201Z");
    const wants = [
      range(5, { season: ["Atom02"], artist: ["artms"], class: ["First"] }),
      exact(1, "atom02-kimlip-201z"),
    ];

    const allocation = allocate(wants, [kimlip, ...firsts]);
    expect(allocation).toEqual([
      { tokenIds: firsts.slice(0, 5).map((o) => o.tokenId), missing: 0 },
      { tokenIds: [kimlip.tokenId], missing: 0 },
    ]);
    expect(isFullyAllocated(allocation)).toBe(true);
  });

  test("an exact row takes its copies before a range listed ahead of it", () => {
    const first = objekt("Atom01", "HeeJin", "101Z");
    const second = objekt("Atom01", "HeeJin", "101Z");
    const wants = [
      range(1, { member: ["HeeJin"] }),
      exact(1, "atom01-heejin-101z"),
    ];

    expect(allocate(wants, [first, second])).toEqual([
      { tokenIds: [second.tokenId], missing: 0 },
      { tokenIds: [first.tokenId], missing: 0 },
    ]);
  });

  test("the narrowest range picks first", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      range(1, { season: ["Atom01"] }),
      range(1, { member: ["HeeJin"] }),
    ];

    expect(allocate(wants, [heejin, kimlip])).toEqual([
      { tokenIds: [kimlip.tokenId], missing: 0 },
      { tokenIds: [heejin.tokenId], missing: 0 },
    ]);
  });

  test("recovers when the greedy pass picks wrong", () => {
    /**
     * Both ranges have two candidates, so the first row goes first and takes
     * HaSeul, the second row's only other option besides KimLip.
     */
    const haseul = objekt("Atom01", "HaSeul", "101Z");
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      range(1, { member: ["HeeJin", "HaSeul"] }),
      range(2, { member: ["HaSeul", "KimLip"] }),
    ];

    expect(allocate(wants, [haseul, heejin, kimlip])).toEqual([
      { tokenIds: [heejin.tokenId], missing: 0 },
      { tokenIds: [haseul.tokenId, kimlip.tokenId], missing: 0 },
    ]);
  });

  test("recovers through a chain of rows", () => {
    const a = objekt("Atom01", "HeeJin", "101Z");
    const b = objekt("Atom01", "HaSeul", "101Z");
    const c = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      range(1, { member: ["HeeJin", "HaSeul"] }),
      range(1, { member: ["HaSeul", "KimLip"] }),
      range(1, { member: ["HeeJin"] }),
    ];

    const allocation = allocate(wants, [b, c, a]);
    expect(isFullyAllocated(allocation)).toBe(true);
    expect(
      allocation.flatMap((row) => row.tokenIds).toSorted((x, y) => x - y),
    ).toEqual([a, b, c].map((o) => o.tokenId).toSorted((x, y) => x - y));
  });

  test("reports how short each row is when nothing can cover it", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const wants = [
      exact(2, "atom01-heejin-101z"),
      range(3, { season: ["Binary01"] }),
    ];

    const allocation = allocate(wants, [heejin]);
    expect(allocation).toEqual([
      { tokenIds: [heejin.tokenId], missing: 1 },
      { tokenIds: [], missing: 3 },
    ]);
    expect(isFullyAllocated(allocation)).toBe(false);
  });

  test("never gives one token to two rows", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const wants = [
      range(1, { member: ["HeeJin"] }),
      range(1, { season: ["Atom01"] }),
    ];

    const allocation = allocate(wants, [heejin]);
    expect(allocation.flatMap((row) => row.tokenIds)).toEqual([heejin.tokenId]);
    expect(allocation.reduce((sum, row) => sum + row.missing, 0)).toBe(1);
  });

  test("matches ranges on every narrowed column", () => {
    const online = objekt("Atom02", "HeeJin", "201Z");
    const offline = objekt("Atom02", "HeeJin", "201A");
    const tripleS = objekt("Atom02", "HeeJin", "201Z", { artist: "triples" });
    const wants = [
      range(3, {
        artist: ["artms"],
        member: ["HeeJin"],
        on_offline: ["offline"],
      }),
    ];

    expect(allocate(wants, [online, offline, tripleS])).toEqual([
      { tokenIds: [offline.tokenId], missing: 2 },
    ]);
  });

  test("allocates nothing for no wants", () => {
    expect(allocate([], [objekt("Atom01", "HeeJin", "101Z")])).toEqual([]);
  });

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

  test("an exact row takes its copies before a choice row listed ahead of it", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      choice(1, ["atom01-heejin-101z", "atom01-kimlip-101z"]),
      exact(1, "atom01-heejin-101z"),
    ];

    expect(allocate(wants, [heejin, kimlip])).toEqual([
      { tokenIds: [kimlip.tokenId], missing: 0 },
      { tokenIds: [heejin.tokenId], missing: 0 },
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

describe("scaleWants", () => {
  test("multiplies every row's count and keeps the rest", () => {
    const wants = [
      exact(2, "atom01-heejin-101z"),
      range(1, { season: ["Atom01"] }),
      choice(3, ["atom01-heejin-101z", "atom01-kimlip-101z"]),
    ];
    expect(scaleWants(wants, 4)).toEqual([
      exact(8, "atom01-heejin-101z"),
      range(4, { season: ["Atom01"] }),
      choice(12, ["atom01-heejin-101z", "atom01-kimlip-101z"]),
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

  test("stops at the free pool, counted in units", () => {
    const inventory = firsts(8);
    expect(
      allocateUnits(wants, inventory, { free: 5, unitSize: 2 }).units,
    ).toBe(2);
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
