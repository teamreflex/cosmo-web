import { describe, expect, test } from "bun:test";
import {
  collapseWholeGroup,
  matchesRange,
  MAX_RANGE_VALUES,
  type RangeFilter,
  rangeFilterSchema,
} from "../src/range";

describe("rangeFilterSchema", () => {
  test("defaults missing columns to any value", () => {
    expect(rangeFilterSchema.parse({ season: ["Atom02"] })).toEqual({
      artist: [],
      member: [],
      season: ["Atom02"],
      class: [],
      on_offline: [],
    });
  });

  test("takes artists in any casing and stores the indexer's lowercase", () => {
    expect(
      rangeFilterSchema.parse({ artist: ["ARTMS", "triples", "tripleS"] })
        .artist,
    ).toEqual(["artms", "triples"]);
  });

  test("removes repeated values", () => {
    expect(
      rangeFilterSchema.parse({ member: ["HeeJin", "HeeJin", "KimLip"] })
        .member,
    ).toEqual(["HeeJin", "KimLip"]);
  });

  test.each([
    ["no columns", {}],
    ["only empty columns", { member: [], season: [] }],
    ["an unknown artist", { artist: ["loona"] }],
    ["an unknown on_offline", { on_offline: ["both"] }],
    ["an empty value", { member: [""] }],
    ["a NUL byte in a member", { member: ["\u0000"] }],
    ["a NUL byte in a season", { season: ["Atom02\u0000"] }],
    ["a NUL byte in a class", { class: ["\u0000"] }],
    // a bidi control would reorder the values shown beside it (FUI-14)
    ["a right-to-left override in a member", { member: ["\u202Eabc"] }],
    ["a bidi isolate in a season", { season: ["Atom02\u2066"] }],
    ["a left-to-right mark in a class", { class: ["\u200EFirst"] }],
    ["an Arabic letter mark in a member", { member: ["Hee\u061CJin"] }],
    [
      "too many values",
      {
        member: Array.from({ length: MAX_RANGE_VALUES + 1 }, (_, i) => `m${i}`),
      },
    ],
  ])("rejects %s", (_, input) => {
    expect(rangeFilterSchema.safeParse(input).success).toBe(false);
  });
});

describe("matchesRange", () => {
  const heejin = {
    artist: "artms",
    member: "HeeJin",
    season: "Atom02",
    class: "First",
    onOffline: "online",
  };
  const filter = rangeFilterSchema.parse({
    season: ["Atom02", "Binary02"],
    class: ["First"],
  });

  test("an empty column matches anything and values within one are ORed", () => {
    expect(matchesRange(filter, heejin)).toBe(true);
    expect(matchesRange(filter, { ...heejin, season: "Binary02" })).toBe(true);
  });

  test("columns are ANDed", () => {
    expect(matchesRange(filter, { ...heejin, class: "Double" })).toBe(false);
    expect(matchesRange(filter, { ...heejin, season: "Cream01" })).toBe(false);
  });

  test("compares values verbatim", () => {
    const members = rangeFilterSchema.parse({ member: ["heejin"] });
    expect(matchesRange(members, heejin)).toBe(false);
  });
});

describe("collapseWholeGroup", () => {
  const artms = ["HeeJin", "HaSeul", "KimLip", "JinSoul", "Choerry"];
  const rosters = new Map([
    ["artms", artms],
    ["triples", ["SeoYeon", "HyeRin", "JiWoo"]],
  ]);
  const filter = (columns: Partial<RangeFilter>) =>
    rangeFilterSchema.parse(columns);

  test("stores one artist's whole roster as that artist", () => {
    expect(
      collapseWholeGroup(filter({ member: [...artms].reverse() }), rosters),
    ).toEqual(filter({ artist: ["artms"] }));
  });

  test("collapses under the artist already chosen, keeping other columns", () => {
    expect(
      collapseWholeGroup(
        filter({ artist: ["artms"], member: artms, season: ["Atom01"] }),
        rosters,
      ),
    ).toEqual(filter({ artist: ["artms"], season: ["Atom01"] }));
  });

  test.each([
    ["a whole group plus another's member", [...artms, "SeoYeon"]],
    ["part of a group", artms.slice(1)],
    ["two whole groups", [...artms, "SeoYeon", "HyeRin", "JiWoo"]],
  ])(
    "keeps %s as members, which an artist would narrow to nothing",
    (_, member) => {
      const kept = filter({ member });
      expect(collapseWholeGroup(kept, rosters)).toEqual(kept);
    },
  );

  test("never collapses into a different artist than the one chosen", () => {
    const kept = filter({ artist: ["triples"], member: artms });
    expect(collapseWholeGroup(kept, rosters)).toEqual(kept);
  });
});
