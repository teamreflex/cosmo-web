import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { Binder } from "@apollo/database/web/types";
import { slugifyObjekt } from "@apollo/util";

export type BinderLayout = Binder["layout"];

export const binderLayouts = [
  "3x3",
  "2x2",
  "4x3",
] as const satisfies readonly BinderLayout[];

export const MAX_BINDERS = 10;
export const MAX_BINDER_PAGES = 20;

/**
 * A new binder's spine colour. An empty binder has no objekts to draw colour
 * presets from, so the create dialog starts here.
 */
export const DEFAULT_BINDER_COLOUR = "#3b2a6b";

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
 * A layout as users read it, columns by rows: "4×3".
 */
export function binderLayoutLabel(layout: BinderLayout) {
  const { columns, rows } = layoutGrids[layout];
  return `${columns}×${rows}`;
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

/**
 * A binder's pockets by slot for each page.
 */
export type BinderPages = Map<number, Map<number, BinderPocketEntry>>;

export function pocketsByPage(entries: readonly BinderPocketEntry[]) {
  const pages: BinderPages = new Map();
  for (const entry of entries) {
    const page = pages.get(entry.page) ?? new Map();
    page.set(entry.slot, entry);
    pages.set(entry.page, page);
  }
  return pages;
}

/**
 * A binder's cover built from its full detail, for a viewer opened without a
 * cover on screen to start from, such as a shared link.
 */
export function binderPreviewFromDetail(binder: BinderDetail): BinderPreview {
  const images = new Map(
    binder.entries.map(({ objekt }) => {
      const tokenId = Number(objekt.tokenId);
      return [
        tokenId,
        {
          tokenId,
          slug: slugifyObjekt(objekt.collectionId),
          collectionId: objekt.collectionId,
          frontImage: objekt.frontImage,
          frontImageVersion: objekt.frontImageVersion,
        },
      ];
    }),
  );

  return {
    id: binder.id,
    slug: binder.slug,
    name: binder.name,
    colour: binder.colour,
    layout: binder.layout,
    pageCount: binder.pageCount,
    entryCount: binder.entries.length,
    artwork: resolveBinderArtwork(
      binder.coverTokenId,
      binder.entries.map(({ page, slot, objekt }) => ({
        page,
        slot,
        tokenId: Number(objekt.tokenId),
      })),
      images,
    ),
  };
}

/**
 * The collection fields a neighbour suggestion compares.
 */
export type SuggestionObjekt = Pick<
  CosmoObjekt,
  "artists" | "member" | "season" | "class"
>;

/**
 * Picker filters proposed from the neighbouring pockets. `null` fields are
 * left open because the neighbours disagree on them. `pockets` holds the
 * 1-based numbers of the one or two pockets it's drawn from, for display.
 */
export type NeighbourSuggestion = {
  artist: ValidArtist;
  member: string | null;
  season: string | null;
  class: string | null;
  pockets: [number] | [number, number];
};

/**
 * Suggest picker filters for a pocket from the filled pockets either side of
 * it on the same page. Nothing is suggested when both are empty or they
 * belong to different artists; otherwise member, season and class are kept
 * wherever every filled neighbour agrees.
 */
export function suggestFromNeighbours(
  entries: readonly (PocketPosition & { objekt: SuggestionObjekt })[],
  pocket: PocketPosition,
): NeighbourSuggestion | null {
  const [first, second] = entries
    .filter(
      (entry) =>
        entry.page === pocket.page && Math.abs(entry.slot - pocket.slot) === 1,
    )
    .toSorted((a, b) => a.slot - b.slot);

  const [artist] = first?.objekt.artists ?? [];
  if (first === undefined || artist === undefined) return null;
  if (second !== undefined && second.objekt.artists[0] !== artist) {
    return null;
  }

  const agreed = (key: "member" | "season" | "class") =>
    second === undefined || second.objekt[key] === first.objekt[key]
      ? first.objekt[key]
      : null;

  return {
    artist,
    member: agreed("member"),
    season: agreed("season"),
    class: agreed("class"),
    pockets:
      second === undefined
        ? [first.slot + 1]
        : [first.slot + 1, second.slot + 1],
  };
}

/**
 * The next empty pocket on a page after the given slot, wrapping round to the
 * top of the page. Pass -1 for the first empty pocket. Null when the page is
 * full.
 */
export function nextEmptySlot(
  layout: BinderLayout,
  filled: readonly PocketPosition[],
  page: number,
  after: number,
): number | null {
  const { pocketsPerPage } = binderGrid(layout);
  const taken = new Set(
    filled.filter((p) => p.page === page).map((p) => p.slot),
  );

  for (let step = 1; step <= pocketsPerPage; step++) {
    const slot = (after + step) % pocketsPerPage;
    if (!taken.has(slot)) return slot;
  }
  return null;
}

const samePocket = (a: PocketPosition, b: PocketPosition) =>
  a.page === b.page && a.slot === b.slot;

const byPocket = (a: PocketPosition, b: PocketPosition) =>
  a.page - b.page || a.slot - b.slot;

/**
 * A binder with an objekt placed into a pocket, mirroring $placeObjekt: the
 * objekt leaves any other pocket, and an objekt it replaces stops being the
 * cover.
 */
export function withPlacedObjekt(
  binder: BinderDetail,
  pocket: PocketPosition,
  objekt: CosmoObjekt,
): BinderDetail {
  const replaced = binder.entries.find(
    (entry) =>
      samePocket(entry, pocket) && entry.objekt.tokenId !== objekt.tokenId,
  );

  return {
    ...binder,
    coverTokenId:
      replaced !== undefined &&
      Number(replaced.objekt.tokenId) === binder.coverTokenId
        ? null
        : binder.coverTokenId,
    entries: [
      ...binder.entries.filter(
        (entry) =>
          !samePocket(entry, pocket) && entry.objekt.tokenId !== objekt.tokenId,
      ),
      { page: pocket.page, slot: pocket.slot, objekt },
    ].toSorted(byPocket),
  };
}

/**
 * A binder with one pocket emptied, mirroring $clearPocket.
 */
export function withClearedPocket(
  binder: BinderDetail,
  pocket: PocketPosition,
): BinderDetail {
  const cleared = binder.entries.find((entry) => samePocket(entry, pocket));

  return {
    ...binder,
    coverTokenId:
      cleared !== undefined &&
      Number(cleared.objekt.tokenId) === binder.coverTokenId
        ? null
        : binder.coverTokenId,
    entries: binder.entries.filter((entry) => !samePocket(entry, pocket)),
  };
}

/**
 * A binder with two pockets swapped, or an objekt moved into an empty pocket,
 * mirroring $swapPockets.
 */
export function withSwappedPockets(
  binder: BinderDetail,
  from: PocketPosition,
  to: PocketPosition,
): BinderDetail {
  return {
    ...binder,
    entries: binder.entries
      .map((entry) => {
        if (samePocket(entry, from)) return { ...entry, ...to };
        if (samePocket(entry, to)) return { ...entry, ...from };
        return entry;
      })
      .toSorted(byPocket),
  };
}

/**
 * A binder without its last page and that page's entries, mirroring
 * $removeLastBinderPage.
 */
export function withoutLastPage(binder: BinderDetail): BinderDetail {
  if (binder.pageCount === 1) return binder;

  const pageCount = binder.pageCount - 1;
  const entries = binder.entries.filter((entry) => entry.page < pageCount);

  return {
    ...binder,
    pageCount,
    entries,
    coverTokenId: entries.some(
      (entry) => Number(entry.objekt.tokenId) === binder.coverTokenId,
    )
      ? binder.coverTokenId
      : null,
  };
}

/**
 * How many presets of each kind the colour picker offers.
 */
const COLOUR_PRESETS_PER_KIND = 4;

/**
 * Colours too close to white to read against a cover's white paper label.
 */
function isNearWhite(hex: string) {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5) > 0.8;
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, COLOUR_PRESETS_PER_KIND)
    .map(([value]) => value);
}

/**
 * Spine colour presets drawn from a binder's own objekts: the most common
 * collection background colours, then the colours of the most common members.
 * Duplicates, invalid hexes and near-white colours are dropped.
 */
export function binderColourPresets(
  entries: readonly {
    objekt: Pick<CosmoObjekt, "backgroundColor" | "member">;
  }[],
  memberColour: (member: string) => string | undefined,
): string[] {
  const backgrounds = mostCommon(
    entries.map((entry) => entry.objekt.backgroundColor.toLowerCase()),
  );
  const members = mostCommon(entries.map((entry) => entry.objekt.member))
    .flatMap((member) => memberColour(member) ?? [])
    .map((colour) => colour.toLowerCase());

  return [...new Set([...backgrounds, ...members])].filter(
    (colour) => /^#[0-9a-f]{6}$/.test(colour) && !isNearWhite(colour),
  );
}

/**
 * How an objekt is named in pocket labels and announcements: "Choerry 112Z".
 */
export function pocketObjektName(
  objekt: Pick<CosmoObjekt, "member" | "collectionNo">,
) {
  return `${objekt.member} ${objekt.collectionNo}`;
}
