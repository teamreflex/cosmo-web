import { describe, expect, test } from "bun:test";
import {
  type InventoryObjekt,
  type TradeWant,
  allocate,
  fitsWant,
  isFullyAllocated,
} from "../src/allocate";
import { validateAssignment } from "../src/assignment";
import { orderInventory } from "../src/inventory";
import { type ObjektAttributes, rangeFilterSchema } from "../src/range";
import { generateCase, seeded } from "./generate";

let nextTokenId = 1;

function objekt(
  overrides: Partial<ObjektAttributes> & { season: string; member: string },
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
  return { kind: "range", count, filter: rangeFilterSchema.parse(filter) };
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
  test("accepts a valid mixed assignment (ASN-01)", () => {
    expect(
      validateAssignment(
        planWants,
        [ids(kimlip), ids(...firsts)],
        planAttributes,
      ),
    ).toEqual({ ok: true });
  });

  test("refuses fewer rows than wants (ASN-02)", () => {
    expect(
      validateAssignment(planWants, [ids(kimlip)], planAttributes),
    ).toEqual({ ok: false, reason: "wrong_row_count" });
  });

  test("refuses more rows than wants (ASN-03)", () => {
    const [a, b] = firsts;
    if (a === undefined || b === undefined) throw new Error("fixture");
    expect(
      validateAssignment(
        [exact(1, a.slug)],
        [ids(a), ids(b)],
        attributesOf(a, b),
      ),
    ).toEqual({ ok: false, reason: "wrong_row_count" });
  });

  test("refuses a row with too few tokens (ASN-04)", () => {
    expect(
      validateAssignment(
        planWants,
        [ids(kimlip), ids(...firsts.slice(0, 4))],
        planAttributes,
      ),
    ).toEqual({ ok: false, reason: "row_count_mismatch", row: 1 });
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
    ).toEqual({ ok: false, reason: "row_count_mismatch", row: 0 });
  });

  test("refuses a token repeated within a row (ASN-06)", () => {
    expect(
      validateAssignment(
        [exact(2, "atom02-kimlip-201z")],
        [[kimlip.tokenId, kimlip.tokenId]],
        planAttributes,
      ),
    ).toEqual({
      ok: false,
      reason: "repeated_token",
      row: 0,
      tokenId: kimlip.tokenId,
    });
  });

  test("refuses a token repeated across rows (ASN-07)", () => {
    expect(
      validateAssignment(
        [exact(1, "atom02-kimlip-201z"), range(1, { member: ["KimLip"] })],
        [ids(kimlip), ids(kimlip)],
        planAttributes,
      ),
    ).toEqual({
      ok: false,
      reason: "repeated_token",
      row: 1,
      tokenId: kimlip.tokenId,
    });
  });

  test("refuses a token with no attributes (ASN-08)", () => {
    expect(
      validateAssignment(
        [exact(1, "atom02-kimlip-201z")],
        [[999_999]],
        planAttributes,
      ),
    ).toEqual({
      ok: false,
      reason: "unknown_token",
      row: 0,
      tokenId: 999_999,
    });
  });

  test("refuses another collection on an exact row (ASN-09)", () => {
    const other = objekt({
      season: "Atom02",
      member: "KimLip",
      slug: "atom02-kimlip-202z",
    });
    expect(
      validateAssignment(
        [exact(1, "atom02-kimlip-201z")],
        [ids(other)],
        attributesOf(other),
      ),
    ).toEqual({ ok: false, reason: "misfit", row: 0, tokenId: other.tokenId });
  });

  describe("refuses a token outside a range on any one column (ASN-10)", () => {
    const want = range(1, {
      artist: ["artms"],
      member: ["HeeJin"],
      season: ["Atom02"],
      class: ["First"],
      on_offline: ["online"],
    });
    const base = { season: "Atom02", member: "HeeJin" };

    test("the narrowed range takes a token on every column", () => {
      const fits = objekt(base);
      expect(
        validateAssignment([want], [ids(fits)], attributesOf(fits)),
      ).toEqual({ ok: true });
    });

    test.each([
      ["artist", { artist: "triples" }],
      ["member", { member: "KimLip" }],
      ["season", { season: "Binary01" }],
      ["class", { class: "Double" }],
      ["on_offline", { onOffline: "offline" }],
    ] satisfies [string, Partial<ObjektAttributes>][])("%s", (_, overrides) => {
      const misfit = objekt({ ...base, ...overrides });
      expect(
        validateAssignment([want], [ids(misfit)], attributesOf(misfit)),
      ).toEqual({
        ok: false,
        reason: "misfit",
        row: 0,
        tokenId: misfit.tokenId,
      });
    });
  });

  test("lets empty range columns take anything (ASN-11)", () => {
    const varied = [
      objekt({ season: "Atom02", member: "HeeJin" }),
      objekt({
        season: "Atom02",
        member: "SeoYeon",
        artist: "triples",
        class: "Special",
        onOffline: "offline",
      }),
      objekt({ season: "Atom02", member: "KimLip", class: "Double" }),
    ];
    expect(
      validateAssignment(
        [range(3, { season: ["Atom02"] })],
        [ids(...varied)],
        attributesOf(...varied),
      ),
    ).toEqual({ ok: true });
  });

  test("refuses swapped rows even though the tokens could fit (ASN-12)", () => {
    const a = objekt({ season: "Atom01", member: "HeeJin" });
    const b = objekt({ season: "Atom01", member: "KimLip" });
    const wants = [exact(1, a.slug), exact(1, b.slug)];
    const attributes = attributesOf(a, b);

    expect(validateAssignment(wants, [ids(a), ids(b)], attributes)).toEqual({
      ok: true,
    });
    expect(validateAssignment(wants, [ids(b), ids(a)], attributes)).toEqual({
      ok: false,
      reason: "misfit",
      row: 0,
      tokenId: b.tokenId,
    });
  });

  test("accepts the fallback's assignment for overlapping ranges (ASN-13)", () => {
    // allocate.test's fixture where the greedy pass picks wrong
    const haseul = objekt({ season: "Atom01", member: "HaSeul" });
    const heejin = objekt({ season: "Atom01", member: "HeeJin" });
    const kimlip01 = objekt({ season: "Atom01", member: "KimLip" });
    const wants = [
      range(1, { member: ["HeeJin", "HaSeul"] }),
      range(2, { member: ["HaSeul", "KimLip"] }),
    ];
    const attributes = attributesOf(haseul, heejin, kimlip01);

    const allocation = allocate(wants, [haseul, heejin, kimlip01]);
    expect(allocation.map(({ tokenIds }) => tokenIds)).toEqual([
      ids(heejin),
      ids(haseul, kimlip01),
    ]);
    expect(
      validateAssignment(
        wants,
        allocation.map(({ tokenIds }) => tokenIds),
        attributes,
      ),
    ).toEqual({ ok: true });
  });

  test("accepts several copies on an exact row (ASN-14)", () => {
    const copies = [1, 2, 3].map(() =>
      objekt({
        season: "Atom02",
        member: "HeeJin",
        slug: "atom02-heejin-101z",
      }),
    );
    expect(
      validateAssignment(
        [exact(3, "atom02-heejin-101z")],
        [ids(...copies)],
        attributesOf(...copies),
      ),
    ).toEqual({ ok: true });
  });

  test("reports the first fault in row order (ASN-15)", () => {
    const a = objekt({ season: "Atom01", member: "HeeJin" });
    const b = objekt({ season: "Atom01", member: "KimLip" });
    const c = objekt({ season: "Atom01", member: "HaSeul" });
    const wants = [exact(1, a.slug), range(2, { season: ["Atom01"] })];
    // row 0 holds a misfit; row 1 repeats a token
    const rows = [ids(b), ids(c, c)];
    const attributes = attributesOf(a, b, c);

    const first = validateAssignment(wants, rows, attributes);
    expect(first).toEqual({
      ok: false,
      reason: "misfit",
      row: 0,
      tokenId: b.tokenId,
    });
    for (let run = 0; run < 5; run++) {
      expect(validateAssignment(wants, rows, attributes)).toEqual(first);
    }

    // a misfit in row 0 wins over a short row 1
    expect(validateAssignment(wants, [ids(b), ids(c)], attributes)).toEqual({
      ok: false,
      reason: "misfit",
      row: 0,
      tokenId: b.tokenId,
    });
    // a row's count is checked before its tokens
    expect(
      validateAssignment(wants, [ids(a, b), ids(c, c)], attributes),
    ).toEqual({
      ok: false,
      reason: "row_count_mismatch",
      row: 0,
    });
  });

  test("never accepts a listing with no wants (ASN-17)", () => {
    expect(validateAssignment([], [], new Map())).toEqual({
      ok: false,
      reason: "no_wants",
    });
    expect(validateAssignment([], [ids(kimlip)], planAttributes)).toEqual({
      ok: false,
      reason: "no_wants",
    });
  });
});

describe("allocate and validateAssignment agree (ASN-16)", () => {
  test("every full allocation validates", () => {
    const random = seeded(16);
    let full = 0;
    for (let run = 0; run < 3000; run++) {
      const { wants, inventory } = generateCase(random);
      if (wants.length === 0) continue;
      const allocation = allocate(wants, orderInventory(inventory));
      if (!isFullyAllocated(allocation)) continue;
      full++;
      expect(
        validateAssignment(
          wants,
          allocation.map(({ tokenIds }) => tokenIds),
          new Map(inventory.map((o) => [o.tokenId, o])),
        ),
      ).toEqual({ ok: true });
    }
    expect(full).toBeGreaterThan(300);
  });
});

describe("fitsWant (FIT-01)", () => {
  const heejin = objekt({ season: "Atom02", member: "HeeJin" });

  test.each([
    ["the same slug", exact(1, heejin.slug), true],
    ["another slug", exact(1, "atom02-heejin-102z"), false],
    ["a matching artist", range(1, { artist: ["ARTMS"] }), true],
    ["another artist", range(1, { artist: ["tripleS"] }), false],
    ["a matching member", range(1, { member: ["HeeJin", "KimLip"] }), true],
    ["another member", range(1, { member: ["KimLip"] }), false],
    ["a matching season", range(1, { season: ["Atom02"] }), true],
    ["another season", range(1, { season: ["Atom01"] }), false],
    ["a matching class", range(1, { class: ["First"] }), true],
    ["another class", range(1, { class: ["Double"] }), false],
    ["a matching on_offline", range(1, { on_offline: ["online"] }), true],
    ["another on_offline", range(1, { on_offline: ["offline"] }), false],
    [
      "empty columns beside one narrowed column",
      range(1, { season: ["Atom02"], member: [] }),
      true,
    ],
  ] satisfies [string, TradeWant, boolean][])("%s", (_, want, fits) => {
    expect(fitsWant(want, heejin)).toBe(fits);
    // allocate takes the token exactly when fitsWant says it fits
    expect(allocate([want], [heejin])).toEqual([
      fits
        ? { tokenIds: [heejin.tokenId], missing: 0 }
        : { tokenIds: [], missing: 1 },
    ]);
  });
});
