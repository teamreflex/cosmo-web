import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { Binder } from "@apollo/database/web/types";

export type BinderLayout = Binder["layout"];

export const binderLayouts = [
  "3x3",
  "2x2",
  "4x3",
] as const satisfies readonly BinderLayout[];

export const MAX_BINDERS = 10;
export const MAX_BINDER_PAGES = 20;

/**
 * How many filled page 1 pockets make up a cover collage.
 */
export const COLLAGE_SIZE = 4;

const layoutGrids = {
  "3x3": { columns: 3, rows: 3 },
  "2x2": { columns: 2, rows: 2 },
  "4x3": { columns: 4, rows: 3 },
} satisfies Record<BinderLayout, { columns: number; rows: number }>;

/**
 * Pages and slots are zero-based in data. Slots count row by row within the
 * layout. Users see both as 1-based numbers.
 */
export type PocketPosition = {
  page: number;
  slot: number;
};

export type PlacedToken = PocketPosition & {
  tokenId: number;
};

/**
 * Grid dimensions of a binder page.
 */
export function binderGrid(layout: BinderLayout) {
  const { columns, rows } = layoutGrids[layout];
  return { columns, rows, pocketsPerPage: columns * rows };
}

/**
 * Whether a pocket exists in a binder with the given layout and page count.
 */
export function isPocketInRange(
  layout: BinderLayout,
  pageCount: number,
  pocket: PocketPosition,
) {
  return (
    pocket.page >= 0 &&
    pocket.page < pageCount &&
    pocket.slot >= 0 &&
    pocket.slot < binderGrid(layout).pocketsPerPage
  );
}

export type EmptyPocket =
  | { kind: "existing"; page: number; slot: number }
  | { kind: "new-page"; page: number; slot: 0 }
  | { kind: "full" };

/**
 * Find the first empty pocket, page by page. When every page is full, the next
 * objekt starts a new page unless the binder is at the page cap.
 */
export function findEmptyPocket(
  layout: BinderLayout,
  pageCount: number,
  filled: PocketPosition[],
): EmptyPocket {
  const { pocketsPerPage } = binderGrid(layout);
  const taken = new Set(filled.map((p) => `${p.page}:${p.slot}`));

  for (let page = 0; page < pageCount; page++) {
    for (let slot = 0; slot < pocketsPerPage; slot++) {
      if (!taken.has(`${page}:${slot}`)) {
        return { kind: "existing", page, slot };
      }
    }
  }

  return pageCount < MAX_BINDER_PAGES
    ? { kind: "new-page", page: pageCount, slot: 0 }
    : { kind: "full" };
}

export type BinderPreviewImage = Pick<
  CosmoObjekt,
  "collectionId" | "frontImage" | "frontImageVersion"
> & {
  tokenId: number;
  slug: string;
};

/**
 * What a binder cover shows: the owner's chosen cover objekt, or else a
 * collage of the first filled pockets on page 1.
 */
export type BinderArtwork =
  | { kind: "cover"; image: BinderPreviewImage }
  | { kind: "collage"; images: BinderPreviewImage[] };

/**
 * Pick a binder's cover artwork from its entries and the images resolved for
 * them. A cover whose image can't be resolved falls back to the collage.
 */
export function resolveBinderArtwork(
  coverTokenId: number | null,
  entries: PlacedToken[],
  images: Map<number, BinderPreviewImage>,
): BinderArtwork {
  const cover = coverTokenId === null ? undefined : images.get(coverTokenId);
  if (cover !== undefined) return { kind: "cover", image: cover };

  return {
    kind: "collage",
    images: entries
      .filter((entry) => entry.page === 0)
      .toSorted((a, b) => a.slot - b.slot)
      .flatMap((entry) => {
        const image = images.get(entry.tokenId);
        return image === undefined ? [] : [image];
      })
      .slice(0, COLLAGE_SIZE),
  };
}

/**
 * A binder as drawn on its cover: the Binders shelf, pinned binders and the
 * viewer's opening animation.
 */
export type BinderPreview = Pick<
  Binder,
  "id" | "slug" | "name" | "colour" | "layout" | "pageCount"
> & {
  entryCount: number;
  artwork: BinderArtwork;
};

export type BinderPocketEntry = PocketPosition & {
  objekt: CosmoObjekt;
};

/**
 * A binder with every page's entries, hydrated with the same objekt shape as
 * pinned objekts, for the viewer and the editor.
 */
export type BinderDetail = Binder & {
  entries: BinderPocketEntry[];
};
