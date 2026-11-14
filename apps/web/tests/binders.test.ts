import { describe, expect, it } from "bun:test";
import {
  type BinderDetail,
  type BinderObjekt,
  withClearedPocket,
  withMovedPage,
  withoutLastPage,
  withPlacedObjekt,
  withSwappedPockets,
} from "../src/lib/universal/binders";

function objekt(tokenId: number): BinderObjekt {
  return {
    collection: {
      collectionId: "Atom01 HeeJin 101Z",
      collectionNo: "101Z",
      member: "HeeJin",
      artist: "artms",
      season: "Atom01",
      class: "First",
      frontImageVersion: null,
      backgroundColor: "#FFFFFF",
      textColor: "#000000",
      bandImageUrl: null,
    },
    objekt: { tokenId, serial: tokenId },
  };
}

// a binder holding each `[page, slot, tokenId]`
function binder(
  pockets: [page: number, slot: number, tokenId: number][],
  overrides: Partial<BinderDetail> = {},
): BinderDetail {
  return {
    id: "0d4c2f7e-5b1a-4c8e-9f3d-2a6b7c8d9e0f",
    createdAt: new Date("2026-10-10T12:00:00Z"),
    updatedAt: new Date("2026-10-10T12:00:00Z"),
    userId: "kairu",
    name: "Favourites",
    slug: "favourites",
    layout: "3x3",
    colour: "#3b2a6b",
    pageCount: 1,
    coverTokenId: null,
    entries: pockets.map(([page, slot, tokenId]) => ({
      page,
      slot,
      objekt: objekt(tokenId),
    })),
    ...overrides,
  };
}

function pockets(detail: BinderDetail) {
  return detail.entries.map((entry) => [
    entry.page,
    entry.slot,
    entry.objekt.objekt.tokenId,
  ]);
}

describe("binder mirrors", () => {
  it("placing an objekt takes it out of its old pocket and uncovers the one it replaces", () => {
    const placed = withPlacedObjekt(
      binder(
        [
          [0, 0, 101],
          [0, 1, 102],
        ],
        { coverTokenId: 101 },
      ),
      { page: 0, slot: 0 },
      objekt(102),
    );

    expect(pockets(placed)).toEqual([[0, 0, 102]]);
    expect(placed.coverTokenId).toBeNull();
  });

  it("clearing the cover's pocket clears the cover", () => {
    const cleared = withClearedPocket(
      binder(
        [
          [0, 0, 101],
          [0, 1, 102],
        ],
        { coverTokenId: 102 },
      ),
      { page: 0, slot: 1 },
    );

    expect(pockets(cleared)).toEqual([[0, 0, 101]]);
    expect(cleared.coverTokenId).toBeNull();
  });

  it("swapping with an empty pocket moves the objekt there", () => {
    expect(
      pockets(
        withSwappedPockets(
          binder([
            [0, 0, 101],
            [0, 4, 102],
          ]),
          { page: 0, slot: 0 },
          { page: 0, slot: 8 },
        ),
      ),
    ).toEqual([
      [0, 4, 102],
      [0, 8, 101],
    ]);
  });

  it("removing the last page drops its objekts, and the cover with them", () => {
    const removed = withoutLastPage(
      binder(
        [
          [0, 0, 101],
          [1, 0, 102],
        ],
        { pageCount: 2, coverTokenId: 102 },
      ),
    );

    expect(removed.pageCount).toBe(1);
    expect(pockets(removed)).toEqual([[0, 0, 101]]);
    expect(removed.coverTokenId).toBeNull();
  });

  it("moving a page shifts the pages between to close the gap", () => {
    expect(
      pockets(
        withMovedPage(
          binder(
            [
              [0, 0, 101],
              [1, 0, 102],
              [2, 0, 103],
            ],
            { pageCount: 3 },
          ),
          0,
          2,
        ),
      ),
    ).toEqual([
      [0, 0, 102],
      [1, 0, 103],
      [2, 0, 101],
    ]);
  });
});
