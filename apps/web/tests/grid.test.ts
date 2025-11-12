import { describe, expect, it } from "bun:test";
import {
  buildCollectionLookupMap,
  calculateGrids,
} from "../src/lib/universal/grid";
import type { Collection } from "../src/lib/server/db/indexer/schema";

// Helper to create mock collections
function createCollection(
  season: string,
  member: string,
  collectionNo: string,
): Collection {
  return {
    id: `${season} ${member} ${collectionNo}`,
    contract: "0x123",
    createdAt: "1997-06-13T00:00:00.000Z",
    slug: `${season}-${member}-${collectionNo}`,
    collectionId: `${season} ${member} ${collectionNo}`,
    season,
    member,
    artist: "artms",
    collectionNo,
    class: "First",
    thumbnailImage: "thumb.jpg",
    frontImage: "front.jpg",
    backImage: "back.jpg",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    accentColor: "#FF0000",
    comoAmount: 10,
    onOffline: "online",
    bandImageUrl: null,
    frontMedia: null,
  };
}

// Helper to create owned collection
function createOwned(
  season: string,
  member: string,
  collectionNo: string,
  transferable: boolean,
) {
  return {
    collectionId: `${season} ${member} ${collectionNo}`,
    transferable,
    season,
    member,
    collectionNo,
  };
}

describe("calculateGrids", () => {
  const allCollections: Collection[] = [
    // JinSoul 1st edition (101-108)
    ...["101z", "102z", "103z", "104z", "105z", "106z", "107z", "108z"].map(
      (no) => createCollection("Atom01", "JinSoul", no),
    ),
    // HeeJin 1st edition (101-108)
    ...["101z", "102z", "103z", "104z", "105z", "106z", "107z", "108z"].map(
      (no) => createCollection("Atom01", "HeeJin", no),
    ),
    // JinSoul 2nd edition (109-116)
    ...["109z", "110z", "111z", "112z", "113z", "114z", "115z", "116z"].map(
      (no) => createCollection("Atom01", "JinSoul", no),
    ),
  ];
  const lookup = buildCollectionLookupMap(allCollections);

  it("should return empty array when no transferable objekts", () => {
    const owned = [
      createOwned("Atom01", "JinSoul", "101z", false),
      createOwned("Atom01", "JinSoul", "102z", false),
    ];

    const result = calculateGrids(owned, lookup);
    expect(result).toHaveLength(0);
  });

  it("should detect a complete grid (1 of each)", () => {
    const owned = [
      createOwned("Atom01", "JinSoul", "101z", true),
      createOwned("Atom01", "JinSoul", "102z", true),
      createOwned("Atom01", "JinSoul", "103z", true),
      createOwned("Atom01", "JinSoul", "104z", true),
      createOwned("Atom01", "JinSoul", "105z", true),
      createOwned("Atom01", "JinSoul", "106z", true),
      createOwned("Atom01", "JinSoul", "107z", true),
      createOwned("Atom01", "JinSoul", "108z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 8 results (1 grid × 8 collections)
    expect(result).toHaveLength(8);

    // All should be marked as owned
    expect(result.every((r) => r.owned)).toBe(true);

    // Check specific collection IDs
    expect(
      result.some((r) => r.collectionId === "Atom01 JinSoul 101z" && r.owned),
    ).toBe(true);
    expect(
      result.some((r) => r.collectionId === "Atom01 JinSoul 108z" && r.owned),
    ).toBe(true);
  });

  it("should detect incomplete grid and show missing objekts", () => {
    const owned = [
      createOwned("Atom01", "JinSoul", "101z", true),
      createOwned("Atom01", "JinSoul", "102z", true),
      createOwned("Atom01", "JinSoul", "103z", true),
      // Missing 104z, 105z, 106z
      createOwned("Atom01", "JinSoul", "107z", true),
      createOwned("Atom01", "JinSoul", "108z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 8 results (1 grid × 8 collections)
    expect(result).toHaveLength(8);

    // Check owned status
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 101z")?.owned,
    ).toBe(true);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 102z")?.owned,
    ).toBe(true);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 103z")?.owned,
    ).toBe(true);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 104z")?.owned,
    ).toBe(false);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 105z")?.owned,
    ).toBe(false);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 106z")?.owned,
    ).toBe(false);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 107z")?.owned,
    ).toBe(true);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 108z")?.owned,
    ).toBe(true);
  });

  it("should detect multiple complete grids with duplicates", () => {
    const owned = [
      // 2 copies of each collection
      ...[
        "101z",
        "102z",
        "103z",
        "104z",
        "105z",
        "106z",
        "107z",
        "108z",
      ].flatMap((no) => [
        createOwned("Atom01", "JinSoul", no, true),
        createOwned("Atom01", "JinSoul", no, true),
      ]),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 16 results (2 grids × 8 collections)
    expect(result).toHaveLength(16);

    // All should be marked as owned
    expect(result.every((r) => r.owned)).toBe(true);
  });

  it("should handle mixed complete and incomplete grids", () => {
    const owned = [
      // Grid 1: complete
      createOwned("Atom01", "HeeJin", "101z", true),
      createOwned("Atom01", "HeeJin", "102z", true),
      createOwned("Atom01", "HeeJin", "103z", true),
      createOwned("Atom01", "HeeJin", "104z", true),
      createOwned("Atom01", "HeeJin", "105z", true),
      createOwned("Atom01", "HeeJin", "106z", true),
      createOwned("Atom01", "HeeJin", "107z", true),
      createOwned("Atom01", "HeeJin", "108z", true),
      // Grid 2: only 108z (incomplete)
      createOwned("Atom01", "HeeJin", "108z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 16 results (2 grids × 8 collections)
    expect(result).toHaveLength(16);

    // Grid 1: all owned
    const grid1Results = result.slice(0, 8);
    expect(grid1Results.every((r) => r.owned)).toBe(true);

    // Grid 2: only 108z owned
    const grid2Results = result.slice(8, 16);
    const owned108 = grid2Results.filter((r) =>
      r.collectionId.includes("108z"),
    );
    const notOwned = grid2Results.filter(
      (r) => !r.collectionId.includes("108z"),
    );

    expect(owned108.every((r) => r.owned)).toBe(true);
    expect(notOwned.every((r) => !r.owned)).toBe(true);
  });

  it("should handle multiple members independently", () => {
    const owned = [
      // JinSoul: complete grid
      ...["101z", "102z", "103z", "104z", "105z", "106z", "107z", "108z"].map(
        (no) => createOwned("Atom01", "JinSoul", no, true),
      ),
      // HeeJin: incomplete grid (missing 108z)
      ...["101z", "102z", "103z", "104z", "105z", "106z", "107z"].map((no) =>
        createOwned("Atom01", "HeeJin", no, true),
      ),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 16 results (2 members × 8 collections)
    expect(result).toHaveLength(16);

    // JinSoul: all owned
    const jinsoulResults = result.filter((r) =>
      r.collectionId.includes("JinSoul"),
    );
    expect(jinsoulResults).toHaveLength(8);
    expect(jinsoulResults.every((r) => r.owned)).toBe(true);

    // HeeJin: 7 owned, 1 not owned
    const heejinResults = result.filter((r) =>
      r.collectionId.includes("HeeJin"),
    );
    expect(heejinResults).toHaveLength(8);
    expect(heejinResults.filter((r) => r.owned)).toHaveLength(7);
    expect(heejinResults.filter((r) => !r.owned)).toHaveLength(1);
    expect(
      heejinResults.find((r) => r.collectionId === "Atom01 HeeJin 108z")?.owned,
    ).toBe(false);
  });

  it("should handle different editions independently", () => {
    const owned = [
      // 1st edition: complete
      ...["101z", "102z", "103z", "104z", "105z", "106z", "107z", "108z"].map(
        (no) => createOwned("Atom01", "JinSoul", no, true),
      ),
      // 2nd edition: only 109z
      createOwned("Atom01", "JinSoul", "109z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 16 results (1st edition: 8, 2nd edition: 8)
    expect(result).toHaveLength(16);

    // 1st edition: all owned
    const edition1 = result.filter((r) => r.collectionId.match(/10[1-8]z/));
    expect(edition1).toHaveLength(8);
    expect(edition1.every((r) => r.owned)).toBe(true);

    // 2nd edition: only 109z owned
    const edition2 = result.filter((r) =>
      r.collectionId.match(/1(09|1[0-6])z/),
    );
    expect(edition2).toHaveLength(8);
    expect(edition2.filter((r) => r.owned)).toHaveLength(1);
    expect(
      edition2.find((r) => r.collectionId === "Atom01 JinSoul 109z")?.owned,
    ).toBe(true);
  });

  it("should ignore non-transferable objekts even if they complete a grid", () => {
    const owned = [
      // All non-transferable
      createOwned("Atom01", "JinSoul", "101z", false),
      createOwned("Atom01", "JinSoul", "102z", false),
      createOwned("Atom01", "JinSoul", "103z", false),
      createOwned("Atom01", "JinSoul", "104z", false),
      createOwned("Atom01", "JinSoul", "105z", false),
      createOwned("Atom01", "JinSoul", "106z", false),
      createOwned("Atom01", "JinSoul", "107z", false),
      createOwned("Atom01", "JinSoul", "108z", false),
      // One transferable
      createOwned("Atom01", "JinSoul", "101z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 8 results (1 grid started with only 101z)
    expect(result).toHaveLength(8);

    // Only 101z should be owned
    expect(result.filter((r) => r.owned)).toHaveLength(1);
    expect(
      result.find((r) => r.collectionId === "Atom01 JinSoul 101z")?.owned,
    ).toBe(true);
  });

  it("should handle two different members both with incomplete sets", () => {
    const owned = [
      // JinSoul: missing 104z, 106z, 108z
      createOwned("Atom01", "JinSoul", "101z", true),
      createOwned("Atom01", "JinSoul", "102z", true),
      createOwned("Atom01", "JinSoul", "103z", true),
      createOwned("Atom01", "JinSoul", "105z", true),
      createOwned("Atom01", "JinSoul", "107z", true),
      // HeeJin: missing 101z, 103z, 105z, 107z
      createOwned("Atom01", "HeeJin", "102z", true),
      createOwned("Atom01", "HeeJin", "104z", true),
      createOwned("Atom01", "HeeJin", "106z", true),
      createOwned("Atom01", "HeeJin", "108z", true),
    ];

    const result = calculateGrids(owned, lookup);

    // Should return 16 results (2 members × 8 collections)
    expect(result).toHaveLength(16);

    // JinSoul: 5 owned, 3 not owned
    const jinsoulResults = result.filter((r) =>
      r.collectionId.includes("JinSoul"),
    );
    expect(jinsoulResults).toHaveLength(8);
    expect(jinsoulResults.filter((r) => r.owned)).toHaveLength(5);
    expect(jinsoulResults.filter((r) => !r.owned)).toHaveLength(3);

    // Check JinSoul missing objekts
    expect(
      jinsoulResults.find((r) => r.collectionId === "Atom01 JinSoul 104z")
        ?.owned,
    ).toBe(false);
    expect(
      jinsoulResults.find((r) => r.collectionId === "Atom01 JinSoul 106z")
        ?.owned,
    ).toBe(false);
    expect(
      jinsoulResults.find((r) => r.collectionId === "Atom01 JinSoul 108z")
        ?.owned,
    ).toBe(false);

    // HeeJin: 4 owned, 4 not owned
    const heejinResults = result.filter((r) =>
      r.collectionId.includes("HeeJin"),
    );
    expect(heejinResults).toHaveLength(8);
    expect(heejinResults.filter((r) => r.owned)).toHaveLength(4);
    expect(heejinResults.filter((r) => !r.owned)).toHaveLength(4);

    // Check HeeJin missing objekts
    expect(
      heejinResults.find((r) => r.collectionId === "Atom01 HeeJin 101z")?.owned,
    ).toBe(false);
    expect(
      heejinResults.find((r) => r.collectionId === "Atom01 HeeJin 103z")?.owned,
    ).toBe(false);
    expect(
      heejinResults.find((r) => r.collectionId === "Atom01 HeeJin 105z")?.owned,
    ).toBe(false);
    expect(
      heejinResults.find((r) => r.collectionId === "Atom01 HeeJin 107z")?.owned,
    ).toBe(false);
  });
});
