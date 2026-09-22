import { describe, expect, it } from "bun:test";
import type {
  BinderPreviewImage,
  PlacedToken,
  PocketPosition,
  SuggestionObjekt,
} from "../src/lib/universal/binders";
import {
  binderGrid,
  findEmptyPocket,
  isPocketInRange,
  MAX_BINDER_PAGES,
  resolveBinderArtwork,
  suggestFromNeighbours,
} from "../src/lib/universal/binders";

function fullPages(pages: number, pocketsPerPage: number): PocketPosition[] {
  return Array.from({ length: pages * pocketsPerPage }, (_, index) => ({
    page: Math.floor(index / pocketsPerPage),
    slot: index % pocketsPerPage,
  }));
}

function image(tokenId: number): BinderPreviewImage {
  return {
    tokenId,
    slug: `atom01-seoyeon-${tokenId}z`,
    collectionId: `Atom01 SeoYeon ${tokenId}Z`,
    frontImage: `https://example.com/${tokenId}.png`,
    frontImageVersion: null,
  };
}

function imagesFor(tokenIds: number[]) {
  return new Map(tokenIds.map((tokenId) => [tokenId, image(tokenId)]));
}

describe("binderGrid", () => {
  it("maps each layout to columns, rows and pockets", () => {
    expect(binderGrid("3x3")).toEqual({
      columns: 3,
      rows: 3,
      pocketsPerPage: 9,
    });
    expect(binderGrid("2x2")).toEqual({
      columns: 2,
      rows: 2,
      pocketsPerPage: 4,
    });
    expect(binderGrid("4x3")).toEqual({
      columns: 4,
      rows: 3,
      pocketsPerPage: 12,
    });
  });
});

describe("isPocketInRange", () => {
  it("accepts every slot of a 3x3 page and rejects the tenth", () => {
    expect(isPocketInRange("3x3", 1, { page: 0, slot: 0 })).toBe(true);
    expect(isPocketInRange("3x3", 1, { page: 0, slot: 8 })).toBe(true);
    expect(isPocketInRange("3x3", 1, { page: 0, slot: 9 })).toBe(false);
  });

  it("bounds 2x2 pages to four slots", () => {
    expect(isPocketInRange("2x2", 1, { page: 0, slot: 3 })).toBe(true);
    expect(isPocketInRange("2x2", 1, { page: 0, slot: 4 })).toBe(false);
  });

  it("bounds 4x3 pages to twelve slots", () => {
    expect(isPocketInRange("4x3", 1, { page: 0, slot: 11 })).toBe(true);
    expect(isPocketInRange("4x3", 1, { page: 0, slot: 12 })).toBe(false);
  });

  it("rejects pages past the page count", () => {
    expect(isPocketInRange("3x3", 2, { page: 1, slot: 0 })).toBe(true);
    expect(isPocketInRange("3x3", 2, { page: 2, slot: 0 })).toBe(false);
  });

  it("rejects negative positions", () => {
    expect(isPocketInRange("3x3", 1, { page: -1, slot: 0 })).toBe(false);
    expect(isPocketInRange("3x3", 1, { page: 0, slot: -1 })).toBe(false);
  });
});

describe("findEmptyPocket", () => {
  it("returns the first pocket of an empty binder", () => {
    expect(findEmptyPocket("3x3", 1, [])).toEqual({
      kind: "existing",
      page: 0,
      slot: 0,
    });
  });

  it("fills gaps before later pockets", () => {
    const filled = [
      { page: 0, slot: 0 },
      { page: 0, slot: 2 },
    ];
    expect(findEmptyPocket("3x3", 1, filled)).toEqual({
      kind: "existing",
      page: 0,
      slot: 1,
    });
  });

  it("moves on to later pages when earlier ones are full", () => {
    const filled = [...fullPages(1, 4), { page: 1, slot: 0 }];
    expect(findEmptyPocket("2x2", 3, filled)).toEqual({
      kind: "existing",
      page: 1,
      slot: 1,
    });
  });

  it("finds an empty trailing page", () => {
    expect(findEmptyPocket("4x3", 2, fullPages(1, 12))).toEqual({
      kind: "existing",
      page: 1,
      slot: 0,
    });
  });

  it("needs a new page when every page is full", () => {
    expect(findEmptyPocket("3x3", 2, fullPages(2, 9))).toEqual({
      kind: "new-page",
      page: 2,
      slot: 0,
    });
  });

  it("is full at the page cap", () => {
    expect(
      findEmptyPocket("2x2", MAX_BINDER_PAGES, fullPages(MAX_BINDER_PAGES, 4)),
    ).toEqual({ kind: "full" });
  });

  it("still finds a gap at the page cap", () => {
    const filled = fullPages(MAX_BINDER_PAGES, 4).filter(
      (p) => !(p.page === 7 && p.slot === 3),
    );
    expect(findEmptyPocket("2x2", MAX_BINDER_PAGES, filled)).toEqual({
      kind: "existing",
      page: 7,
      slot: 3,
    });
  });
});

describe("resolveBinderArtwork", () => {
  const entries: PlacedToken[] = [
    { page: 1, slot: 0, tokenId: 90 },
    { page: 0, slot: 5, tokenId: 50 },
    { page: 0, slot: 1, tokenId: 10 },
    { page: 0, slot: 8, tokenId: 80 },
    { page: 0, slot: 3, tokenId: 30 },
    { page: 0, slot: 6, tokenId: 60 },
  ];

  it("uses the cover when one is set", () => {
    expect(
      resolveBinderArtwork(60, entries, imagesFor([10, 30, 50, 60, 80, 90])),
    ).toEqual({ kind: "cover", image: image(60) });
  });

  it("collages the first four filled page 1 pockets by slot", () => {
    expect(
      resolveBinderArtwork(null, entries, imagesFor([10, 30, 50, 60, 80, 90])),
    ).toEqual({
      kind: "collage",
      images: [image(10), image(30), image(50), image(60)],
    });
  });

  it("collages fewer than four when page 1 has fewer objekts", () => {
    expect(
      resolveBinderArtwork(
        null,
        [
          { page: 0, slot: 4, tokenId: 40 },
          { page: 1, slot: 0, tokenId: 90 },
        ],
        imagesFor([40, 90]),
      ),
    ).toEqual({ kind: "collage", images: [image(40)] });
  });

  it("is an empty collage for an empty binder", () => {
    expect(resolveBinderArtwork(null, [], new Map())).toEqual({
      kind: "collage",
      images: [],
    });
  });

  it("skips objekts the indexer couldn't resolve", () => {
    expect(
      resolveBinderArtwork(null, entries, imagesFor([30, 50, 60, 80])),
    ).toEqual({
      kind: "collage",
      images: [image(30), image(50), image(60), image(80)],
    });
  });

  it("falls back to the collage when the cover can't be resolved", () => {
    expect(resolveBinderArtwork(99, entries, imagesFor([10, 30]))).toEqual({
      kind: "collage",
      images: [image(10), image(30)],
    });
  });
});

describe("suggestFromNeighbours", () => {
  const choerry110 = traits("artms", "Choerry", "Atom02", "First");
  const choerry112 = traits("artms", "Choerry", "Atom02", "First");
  const choerryDouble = traits("artms", "Choerry", "Atom02", "Double");
  const jinsoul = traits("artms", "JinSoul", "Atom02", "First");
  const heejin = traits("artms", "HeeJin", "Binary01", "Special");
  const seoyeon = traits("tripleS", "SeoYeon", "Atom02", "First");

  it("suggests nothing when both neighbours are empty", () => {
    const entries = [pocket(0, 0, choerry110), pocket(0, 8, jinsoul)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 4 })).toBeNull();
  });

  it("suggests every attribute from a single neighbour", () => {
    const entries = [pocket(0, 3, choerry110)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 4 })).toEqual({
      artist: "artms",
      member: "Choerry",
      season: "Atom02",
      class: "First",
      pockets: [4],
    });
  });

  it("keeps attributes both neighbours agree on", () => {
    const entries = [pocket(0, 1, choerry110), pocket(0, 3, choerry112)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 2 })).toEqual({
      artist: "artms",
      member: "Choerry",
      season: "Atom02",
      class: "First",
      pockets: [2, 4],
    });
  });

  it("drops the member when the neighbours disagree on it", () => {
    const entries = [pocket(0, 6, jinsoul), pocket(0, 4, choerry110)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 5 })).toEqual({
      artist: "artms",
      member: null,
      season: "Atom02",
      class: "First",
      pockets: [5, 7],
    });
  });

  it("drops the season and class when the neighbours disagree on them", () => {
    const entries = [pocket(0, 6, jinsoul), pocket(0, 8, heejin)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 7 })).toEqual({
      artist: "artms",
      member: null,
      season: null,
      class: null,
      pockets: [7, 9],
    });
  });

  it("drops only the class when the neighbours differ in class alone", () => {
    const entries = [pocket(0, 0, choerry110), pocket(0, 2, choerryDouble)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 1 })).toEqual({
      artist: "artms",
      member: "Choerry",
      season: "Atom02",
      class: null,
      pockets: [1, 3],
    });
  });

  it("suggests nothing when the neighbours belong to different artists", () => {
    const entries = [pocket(0, 0, choerry110), pocket(0, 2, seoyeon)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 1 })).toBeNull();
  });

  it("reads only the next pocket for the first pocket of a page", () => {
    const entries = [pocket(0, 8, seoyeon), pocket(1, 1, choerry110)];
    expect(suggestFromNeighbours(entries, { page: 1, slot: 0 })).toEqual({
      artist: "artms",
      member: "Choerry",
      season: "Atom02",
      class: "First",
      pockets: [2],
    });
  });

  it("reads only the previous pocket for the last pocket of a page", () => {
    const entries = [pocket(0, 7, seoyeon), pocket(1, 0, choerry110)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 8 })).toEqual({
      artist: "tripleS",
      member: "SeoYeon",
      season: "Atom02",
      class: "First",
      pockets: [8],
    });
  });

  it("ignores neighbouring slots on other pages", () => {
    const entries = [pocket(1, 3, choerry110), pocket(1, 5, jinsoul)];
    expect(suggestFromNeighbours(entries, { page: 0, slot: 4 })).toBeNull();
  });
});

function traits(
  artist: SuggestionObjekt["artists"][number],
  member: string,
  season: string,
  className: string,
): SuggestionObjekt {
  return { artists: [artist], member, season, class: className };
}

function pocket(page: number, slot: number, objekt: SuggestionObjekt) {
  return { page, slot, objekt };
}
