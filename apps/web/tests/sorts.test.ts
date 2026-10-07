import { describe, expect, it } from "bun:test";
import { sortObjektListItems } from "../src/lib/universal/objekt-list-sort";
import {
  collectionSorts,
  indexSorts,
  profileSorts,
  supportedSort,
} from "../src/lib/universal/sorts";

describe("sort presets", () => {
  it("offers serial, duplicate and mint sorts only where they apply", () => {
    for (const sort of ["serialAsc", "serialDesc", "duplicatesDesc"] as const) {
      expect(collectionSorts).not.toContain(sort);
      expect(indexSorts).not.toContain(sort);
      expect(profileSorts).toContain(sort);
    }
    for (const sort of ["mintsAsc", "mintsDesc"] as const) {
      expect(collectionSorts).not.toContain(sort);
      expect(indexSorts).toContain(sort);
      expect(profileSorts).toContain(sort);
    }
  });

  it("falls back to newest for an unsupported or missing sort", () => {
    expect(supportedSort("mintsAsc", indexSorts)).toBe("mintsAsc");
    expect(supportedSort("mintsAsc", collectionSorts)).toBe("newest");
    expect(supportedSort("duplicatesDesc", indexSorts)).toBe("newest");
    expect(supportedSort(null, profileSorts)).toBe("newest");
    expect(supportedSort(undefined, profileSorts)).toBe("newest");
  });
});

describe("sortObjektListItems", () => {
  const item = (slug: string, entryCreatedAt: string) => ({
    slug,
    member: "SeoYeon",
    collectionNo: "101Z",
    entryCreatedAt,
  });
  const mintCounts = new Map([
    ["rare", 10],
    ["common", 5000],
    ["middle", 400],
  ]);
  const items = () => [
    item("common", "2026-10-01T00:00:00.000Z"),
    item("rare", "2026-10-02T00:00:00.000Z"),
    item("middle", "2026-10-03T00:00:00.000Z"),
    item("rare", "2026-10-04T00:00:00.000Z"),
  ];

  it("orders by mint count, newest-added first within a collection", () => {
    const asc = items();
    sortObjektListItems(asc, "mintsAsc", { mintCounts });
    expect(asc.map((i) => [i.slug, i.entryCreatedAt.slice(0, 10)])).toEqual([
      ["rare", "2026-10-04"],
      ["rare", "2026-10-02"],
      ["middle", "2026-10-03"],
      ["common", "2026-10-01"],
    ]);

    const desc = items();
    sortObjektListItems(desc, "mintsDesc", { mintCounts });
    expect(desc.map((i) => i.slug)).toEqual([
      "common",
      "middle",
      "rare",
      "rare",
    ]);
  });

  it("treats sorts lists don't support as newest", () => {
    const sorted = items();
    sortObjektListItems(sorted, "duplicatesDesc", {});
    expect(sorted.map((i) => i.entryCreatedAt.slice(0, 10))).toEqual([
      "2026-10-04",
      "2026-10-03",
      "2026-10-02",
      "2026-10-01",
    ]);
  });
});
