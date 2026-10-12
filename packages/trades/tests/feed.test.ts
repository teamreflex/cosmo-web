import { describe, expect, test } from "bun:test";
import {
  type FeedSideFilters,
  type FeedWantRow,
  matchesLookingFor,
  matchesOffering,
} from "../src/feed";
import { type ObjektAttributes, rangeFilterSchema } from "../src/range";

function objekt(
  season: string,
  member: string,
  overrides: Partial<ObjektAttributes> = {},
): ObjektAttributes {
  return {
    slug: `${season}-${member}-101z`.toLowerCase(),
    artist: "artms",
    member,
    season,
    class: "First",
    onOffline: "online",
    ...overrides,
  };
}

function exactRow(attributes: ObjektAttributes): FeedWantRow {
  return { kind: "exact", objekt: attributes };
}

function rangeRow(
  filter: Parameters<typeof rangeFilterSchema.parse>[0],
): FeedWantRow {
  return { kind: "range", filter: rangeFilterSchema.parse(filter) };
}

const atom02HeeJin = objekt("Atom02", "HeeJin");
const binary01KimLip = objekt("Binary01", "KimLip");

describe("matchesOffering", () => {
  test.each([
    ["no filters", {}],
    ["only empty columns", { season: [], member: [] }],
  ] satisfies [string, FeedSideFilters][])(
    "matches any listing with %s (ORC-01)",
    (_, filters) => {
      expect(matchesOffering(filters, [atom02HeeJin])).toBe(true);
      expect(matchesOffering(filters, [atom02HeeJin, binary01KimLip])).toBe(
        true,
      );
      expect(matchesOffering(filters, [])).toBe(true);
    },
  );

  test("needs one objekt to satisfy every column (ORC-02)", () => {
    const items = [atom02HeeJin, binary01KimLip];
    expect(
      matchesOffering({ season: ["Binary01"], member: ["HeeJin"] }, items),
    ).toBe(false);
    expect(
      matchesOffering({ season: ["Atom02"], member: ["HeeJin"] }, items),
    ).toBe(true);
  });

  describe("ORs values within a column and ANDs columns (ORC-03)", () => {
    const filters = { season: ["Atom02", "Binary01"], class: ["First"] };

    test.each([
      ["an Atom02 First", [objekt("Atom02", "HeeJin")], true],
      ["a Binary01 First", [objekt("Binary01", "HeeJin")], true],
      [
        "an Atom02 Double beside a Binary01 First",
        [
          objekt("Atom02", "HeeJin", { class: "Double" }),
          objekt("Binary01", "KimLip"),
        ],
        true,
      ],
      [
        "an Atom02 Double beside a Cream01 First",
        [
          objekt("Atom02", "HeeJin", { class: "Double" }),
          objekt("Cream01", "KimLip"),
        ],
        false,
      ],
      ["a Cream01 First", [objekt("Cream01", "HeeJin")], false],
      [
        "a Binary01 Double",
        [objekt("Binary01", "HeeJin", { class: "Double" })],
        false,
      ],
    ] satisfies [string, ObjektAttributes[], boolean][])(
      "%s",
      (_, items, expected) => {
        expect(matchesOffering(filters, items)).toBe(expected);
      },
    );
  });

  test("compares every column but the artist verbatim", () => {
    expect(matchesOffering({ member: ["heejin"] }, [atom02HeeJin])).toBe(false);
    expect(
      matchesOffering({ on_offline: ["offline"] }, [
        objekt("Atom02", "HeeJin", { onOffline: "offline" }),
      ]),
    ).toBe(true);
  });
});

describe("matchesLookingFor", () => {
  test("exact rows match their collection, range rows their columns (ORC-04)", () => {
    const wants = [
      exactRow(
        objekt("Atom02", "KimLip", {
          slug: "atom02-kimlip-201z",
          class: "Double",
        }),
      ),
      rangeRow({ season: ["Atom02"], class: ["First"], artist: ["artms"] }),
    ];
    // the range leaves member empty, so it matches any member
    expect(matchesLookingFor({ member: ["HeeJin"] }, wants)).toBe(true);
    expect(matchesLookingFor({ member: ["KimLip"] }, wants)).toBe(true);
    expect(matchesLookingFor({ season: ["Binary01"] }, wants)).toBe(false);
    expect(
      matchesLookingFor({ member: ["HeeJin"], class: ["Double"] }, wants),
    ).toBe(false);
    expect(
      matchesLookingFor({ member: ["KimLip"], class: ["Double"] }, wants),
    ).toBe(true);
  });

  test("needs one row to satisfy every column (ORC-05)", () => {
    const filters = { season: ["Binary01"], member: ["KimLip"] };
    const atom02KimLip = rangeRow({ season: ["Atom02"], member: ["KimLip"] });

    // row 2 leaves member empty, so it matches KimLip on its own
    expect(
      matchesLookingFor(filters, [
        atom02KimLip,
        rangeRow({ season: ["Binary01"] }),
      ]),
    ).toBe(true);
    // with row 2 narrowed to HeeJin, no single row holds both values
    expect(
      matchesLookingFor(filters, [
        atom02KimLip,
        rangeRow({ season: ["Binary01"], member: ["HeeJin"] }),
      ]),
    ).toBe(false);
  });

  test("never matches the payment side on a narrowed filter (ORC-06)", () => {
    const wants: FeedWantRow[] = [{ kind: "payment" }];
    expect(matchesLookingFor({ member: ["HeeJin"] }, wants)).toBe(false);
    expect(matchesLookingFor({ artist: ["artms"] }, wants)).toBe(false);
    expect(matchesLookingFor({}, wants)).toBe(true);
    expect(matchesLookingFor({ member: [] }, wants)).toBe(true);
    expect(
      matchesLookingFor({ member: ["HeeJin"] }, [
        { kind: "payment" },
        rangeRow({ member: ["HeeJin"] }),
      ]),
    ).toBe(true);
  });

  test("ORs values within a range column", () => {
    const wants = [rangeRow({ season: ["Atom02", "Binary01"] })];
    expect(matchesLookingFor({ season: ["Binary01", "Cream01"] }, wants)).toBe(
      true,
    );
    expect(matchesLookingFor({ season: ["Cream01"] }, wants)).toBe(false);
  });
});

test("compares artists case-insensitively on both sides (ORC-07)", () => {
  const filters = { artist: ["tripleS"] };
  const seoyeon = objekt("Atom01", "SeoYeon", { artist: "triples" });

  expect(matchesOffering(filters, [seoyeon])).toBe(true);
  expect(matchesLookingFor(filters, [exactRow(seoyeon)])).toBe(true);
  expect(matchesLookingFor(filters, [rangeRow({ artist: ["tripleS"] })])).toBe(
    true,
  );
  expect(matchesOffering({ artist: ["ARTMS"] }, [seoyeon])).toBe(false);
});
