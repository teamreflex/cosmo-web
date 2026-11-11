import { describe, expect, test } from "bun:test";
import {
  allocate,
  type InventoryObjekt,
  isFullyAllocated,
  type TradeWant,
} from "../src/allocate";
import { validateAssignment } from "../src/assignment";
import { type IndexedAttributes, rangeFilterSchema } from "../src/range";
import { generateCase, seeded } from "./generate";

let nextTokenId = 1;

function objekt(
  overrides: Partial<IndexedAttributes> & { season: string; member: string },
): InventoryObjekt {
  const attributes = {
    artist: "artms",
    class: "First",
    onOffline: "online",
    collectionNo: "101Z",
    ...overrides,
  };
  return {
    tokenId: nextTokenId++,
    slug:
      overrides.slug ??
      `${attributes.season}-${attributes.member}-${attributes.collectionNo}`.toLowerCase(),
    artist: attributes.artist,
    member: attributes.member,
    collectionNo: attributes.collectionNo,
    season: attributes.season,
    class: attributes.class,
    onOffline: attributes.onOffline,
  };
}

function exact(count: number, slug: string): TradeWant {
  return { kind: "exact", count, slug };
}

function range(
  count: number,
  filter: Parameters<typeof rangeFilterSchema.parse>[0],
): TradeWant {
  return { kind: "range", count, ranges: [rangeFilterSchema.parse(filter)] };
}

function attributesOf(...objekts: readonly InventoryObjekt[]) {
  return new Map(objekts.map((o) => [o.tokenId, o]));
}

const ids = (...objekts: readonly InventoryObjekt[]) =>
  objekts.map(({ tokenId }) => tokenId);

// 1× Atom02 KimLip 201Z + 5× Atom02 · ARTMS · First
const kimlip = objekt({
  season: "Atom02",
  member: "KimLip",
  class: "Double",
  slug: "atom02-kimlip-201z",
});
const firsts = ["HeeJin", "HaSeul", "JinSoul", "Choerry", "YeoJin"].map(
  (member) => objekt({ season: "Atom02", member }),
);
const planWants = [
  exact(1, "atom02-kimlip-201z"),
  range(5, { season: ["Atom02"], artist: ["artms"], class: ["First"] }),
];
const planAttributes = attributesOf(kimlip, ...firsts);

describe("validateAssignment", () => {
  test("refuses more rows than wants (ASN-03)", () => {
    const [a, b] = firsts;
    if (a === undefined || b === undefined) throw new Error("fixture");
    expect(
      validateAssignment(
        [exact(1, a.slug)],
        [ids(a), ids(b)],
        attributesOf(a, b),
      ),
    ).toBe(false);
  });

  test("refuses a row with too few tokens (ASN-04)", () => {
    expect(
      validateAssignment(
        planWants,
        [ids(kimlip), ids(...firsts.slice(0, 4))],
        planAttributes,
      ),
    ).toBe(false);
  });

  test("refuses a row with too many tokens (ASN-05)", () => {
    const second = objekt({
      season: "Atom02",
      member: "KimLip",
      slug: "atom02-kimlip-201z",
    });
    expect(
      validateAssignment(
        planWants,
        [ids(kimlip, second), ids(...firsts)],
        attributesOf(kimlip, second, ...firsts),
      ),
    ).toBe(false);
  });

  test("refuses a token repeated within a row (ASN-06)", () => {
    expect(
      validateAssignment(
        [exact(2, "atom02-kimlip-201z")],
        [[kimlip.tokenId, kimlip.tokenId]],
        planAttributes,
      ),
    ).toBe(false);
  });

  test("refuses a token repeated across rows (ASN-07)", () => {
    expect(
      validateAssignment(
        [exact(1, "atom02-kimlip-201z"), range(1, { member: ["KimLip"] })],
        [ids(kimlip), ids(kimlip)],
        planAttributes,
      ),
    ).toBe(false);
  });

  test("refuses swapped rows even though the tokens could fit (ASN-12)", () => {
    const a = objekt({ season: "Atom01", member: "HeeJin" });
    const b = objekt({ season: "Atom01", member: "KimLip" });
    const wants = [exact(1, a.slug), exact(1, b.slug)];
    const attributes = attributesOf(a, b);

    expect(validateAssignment(wants, [ids(a), ids(b)], attributes)).toBe(true);
    expect(validateAssignment(wants, [ids(b), ids(a)], attributes)).toBe(false);
  });
});

describe("allocate and validateAssignment agree (ASN-16)", () => {
  test("every full allocation validates", () => {
    const random = seeded(16);
    let full = 0;
    for (let run = 0; run < 300; run++) {
      const { wants, inventory } = generateCase(random);
      if (wants.length === 0) continue;
      const allocation = allocate(wants, inventory);
      if (!isFullyAllocated(allocation)) continue;
      full++;
      expect(
        validateAssignment(
          wants,
          allocation.map(({ tokenIds }) => tokenIds),
          new Map(inventory.map((o) => [o.tokenId, o])),
        ),
      ).toBe(true);
    }
    expect(full).toBeGreaterThan(30);
  });
});
