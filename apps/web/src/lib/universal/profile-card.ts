/**
 * Bump whenever the card's look changes. It's part of the image URL, so
 * Discord and Cloudflare fetch the new design instead of a cached copy.
 */
export const PROFILE_CARD_VERSION = 3;

export const PROFILE_CARD_WIDTH = 1200;
export const PROFILE_CARD_HEIGHT = 630;

/**
 * Family names the card's fonts are registered under in the renderer.
 */
export const PROFILE_CARD_FONTS = {
  display: "Halvar Breit",
  body: "DM Sans",
  mono: "JetBrains Mono",
};

/**
 * Most objekts a card shows. Past this the splash is mostly texture at
 * Discord's embed size.
 */
export const PROFILE_CARD_MAX_OBJEKTS = 25;

/**
 * Image path for a profile's OpenGraph card.
 */
export function profileCardPath(identifier: string) {
  return `/api/og/profile/${encodeURIComponent(identifier)}?v=${PROFILE_CARD_VERSION}`;
}

export type ProfileCardObjekt = {
  tokenId: string;
  image: string;
};

export type ProfileCard = {
  /** Username, or the full address for an account without one. */
  name: string;
  isAddress: boolean;
  objekts: ProfileCardObjekt[];
  objektCount: number;
  /** Timestamp of the first objekt the account received. */
  since: string | null;
};

export type CardPlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  zIndex: number;
};

const ASPECT = 8.5 / 5.5;

/**
 * Up to six cards don't read as a splash, so they get hand-placed layouts
 * instead: a fan for 1–4, the 3-card fan plus a pair above the name panel for
 * 5, and two staggered rows for 6. Listed back to front.
 */
const FANS: readonly (readonly {
  x: number;
  y: number;
  width: number;
  rotate: number;
}[])[] = [
  [],
  [{ x: 900, y: 315, width: 300, rotate: 6 }],
  [
    { x: 820, y: 330, width: 280, rotate: -8 },
    { x: 1020, y: 300, width: 280, rotate: 7 },
  ],
  [
    { x: 765, y: 335, width: 230, rotate: -9 },
    { x: 1070, y: 335, width: 230, rotate: 9 },
    { x: 918, y: 312, width: 255, rotate: 0 },
  ],
  [
    { x: 640, y: 350, width: 220, rotate: -12 },
    { x: 1100, y: 350, width: 220, rotate: 12 },
    { x: 790, y: 318, width: 235, rotate: -4 },
    { x: 950, y: 318, width: 235, rotate: 4 },
  ],
  [
    { x: 330, y: 150, width: 195, rotate: -10 },
    { x: 515, y: 175, width: 195, rotate: 7 },
    { x: 780, y: 345, width: 230, rotate: -9 },
    { x: 1080, y: 345, width: 230, rotate: 9 },
    { x: 930, y: 320, width: 255, rotate: 0 },
  ],
  [
    { x: 600, y: 175, width: 205, rotate: -6 },
    { x: 810, y: 160, width: 205, rotate: 3 },
    { x: 1020, y: 175, width: 205, rotate: -3 },
    { x: 705, y: 445, width: 215, rotate: 5 },
    { x: 915, y: 458, width: 215, rotate: -4 },
    { x: 1125, y: 440, width: 215, rotate: 7 },
  ],
];

/**
 * The logo plus some breathing room. Cards stay off it unless there are more
 * than `LOGO_ZONE_MAX` of them, when an empty corner in an otherwise full splash
 * looks like a gap. The name panel is translucent, so cards may sit under that.
 */
const LOGO_ZONE = { left: 24, top: 20, right: 168, bottom: 126 };
const LOGO_ZONE_MAX = 15;

/**
 * Seeded PRNG (mulberry32), so a card renders the same way every time.
 */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splash seed from the objekts on the card (FNV-1a), so the same objekts
 * always land in the same places and a change reshuffles them.
 */
export function cardSeed(tokenIds: readonly string[]) {
  let hash = 0x811c9dc5;
  for (const char of tokenIds.join(",")) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193);
  }
  return hash >>> 0;
}

function placement(
  x: number,
  y: number,
  width: number,
  rotate: number,
  zIndex: number,
): CardPlacement {
  const height = width * ASPECT;
  return {
    left: Math.round(x - width / 2),
    top: Math.round(y - height / 2),
    width: Math.round(width),
    height: Math.round(height),
    rotate,
    zIndex,
  };
}

/**
 * Where each objekt goes on the card: a hand-placed layout for up to six,
 * otherwise a seeded scatter.
 */
export function placeCards(count: number, seed: number): CardPlacement[] {
  const fan = FANS.at(count);
  if (fan !== undefined) {
    return fan.map((spot, i) =>
      placement(spot.x, spot.y, spot.width, spot.rotate, i),
    );
  }
  return scatter(count, seed);
}

/**
 * Most a sparse scatter may bleed past the edges, reached at the cap.
 */
const MAX_BLEED = 70;

/**
 * Least share of each card kept on the image.
 */
const MIN_VISIBLE = 0.75;

/**
 * One card per cell of a jittered grid sized to the count, cells taken in
 * shuffled order. Sparse cards stay inside the image; denser ones bleed past
 * the edges, which reads as a splash rather than cropping. In a sparse
 * scatter, a card that would cover the logo is nudged out of the corner.
 */
function scatter(count: number, seed: number): CardPlacement[] {
  const rand = random(seed);
  const bleed =
    MAX_BLEED *
    Math.min(1, Math.max(0, (count - 8) / (PROFILE_CARD_MAX_OBJEKTS - 8)));
  const region = {
    x: -bleed,
    y: -bleed,
    width: PROFILE_CARD_WIDTH + 2 * bleed,
    height: PROFILE_CARD_HEIGHT + 2 * bleed,
  };
  const cols = Math.round(Math.sqrt((count * region.width) / region.height));
  const rows = Math.ceil(count / cols);
  const cellWidth = region.width / cols;
  const cellHeight = region.height / rows;
  const baseWidth = Math.min(
    250,
    cellWidth * 0.95,
    (cellHeight * 1.15) / ASPECT,
  );

  return Array.from({ length: cols * rows }, (_, i) => ({
    col: i % cols,
    row: Math.floor(i / cols),
    order: rand(),
  }))
    .toSorted((a, b) => a.order - b.order)
    .slice(0, count)
    .map((cell) => {
      const width = baseWidth * (0.9 + rand() * 0.22);
      const height = width * ASPECT;
      const overhangX = (1 - MIN_VISIBLE) * width + bleed;
      const overhangY = (1 - MIN_VISIBLE) * height + bleed;
      let x = clamp(
        region.x + (cell.col + 0.5 + (rand() - 0.5) * 0.45) * cellWidth,
        width / 2 - overhangX,
        PROFILE_CARD_WIDTH - width / 2 + overhangX,
      );
      let y = clamp(
        region.y + (cell.row + 0.5 + (rand() - 0.5) * 0.45) * cellHeight,
        height / 2 - overhangY,
        PROFILE_CARD_HEIGHT - height / 2 + overhangY,
      );

      // push the card right or down, whichever moves it less
      const pushRight = LOGO_ZONE.right - (x - width / 2);
      const pushDown = LOGO_ZONE.bottom - (y - height / 2);
      if (count <= LOGO_ZONE_MAX && pushRight > 0 && pushDown > 0) {
        if (pushRight < pushDown) x += pushRight;
        else y += pushDown;
      }

      return placement(
        x,
        y,
        width,
        Math.round((rand() - 0.5) * 38),
        Math.floor(rand() * 100),
      );
    });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
