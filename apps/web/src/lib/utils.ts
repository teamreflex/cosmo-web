import type { ValidArtist } from "@apollo/cosmo/types/common";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as z from "zod";
import { env } from "./env/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PropsWithClassName<T> = T & { className?: string };

/**
 * Get the base URL for the app.
 */
export function baseUrl() {
  const scheme = env.VITE_APP_ENV === "development" ? "http" : "https";
  return `${scheme}://${env.VITE_BASE_URL}`;
}

/**
 * Get the ordinal suffix for a number.
 */
export function ordinal(input: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = input % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  return suffix ? input + suffix : input;
}

/**
 * Sanitize and validate a UUID string.
 * Discord users will accidentally apply formatting to URLs, resulting in an ID of something like `8043b748-011c-4705-a0a1-eb9d261970ff**`
 * This will error when sent to Postgres, so we need to sanitize it.
 */
export function sanitizeUuid(uuid: string): string | null {
  const schema = z
    .string()
    .transform((val) => val.slice(0, 36))
    .pipe(z.uuid());

  const result = schema.safeParse(uuid);
  return result.success ? result.data : null;
}

/**
 * Track an event with Umami.
 * Handles when the tracking script isn't loaded.
 */
export function track(event: string) {
  if (typeof umami !== "undefined") {
    umami.track(event)?.catch(() => void 0);
  }
}

/**
 * Objekt border colors for each artist, based on 1st gen fanclub colors.
 * Used for member filter buttons.
 */
export const artistColors: Record<ValidArtist, string> = {
  tripleS: "#8ebdd1",
  artms: "#D5B7E2",
  idntt: "#25347C",
};

/**
 * Generate a random hex color.
 */
export function randomColor(): string {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

/**
 * Colors and order for each season.
 */
const seasonConfig = {
  atom: {
    color: "#FFDD00",
    order: 0,
  },
  binary: {
    color: "#75FB4C",
    order: 1,
  },
  cream: {
    color: "#FF7477",
    order: 2,
  },
  divine: {
    color: "#B400FF",
    order: 3,
  },
  ever: {
    color: "#33ecfd",
    order: 4,
  },
  summer: {
    color: "#619AFF",
    order: 0,
  },
  autumn: {
    color: "#B5315A",
    order: 1,
  },
  winter: {
    color: "#C6C6C6",
    order: 2,
  },
  spring: {
    color: "#FFE527",
    order: 3,
  },
} as const;
type Season = keyof typeof seasonConfig;

/**
 * Extract the season name and number from a season string.
 */
function extractSeason(season: string): [Season, number] | null {
  const match = season.match(/^([a-zA-Z]+)(\d+)?$/);
  if (!match) return null;
  const name = match[1]?.toLowerCase() as Season;
  if (!(name in seasonConfig)) return null;
  const num = match[2] ? parseInt(match[2], 10) : 0;
  return [name, num];
}

/**
 * Get the color for a season.
 */
export function getSeasonColor(season: string) {
  const match = extractSeason(season);
  return match ? seasonConfig[match[0]].color : null;
}

/**
 * Remap seasons to a consistent order.
 * Primary sort by season number descending, secondary by season order descending.
 */
export function seasonSort(a: string, b: string) {
  const aMatch = extractSeason(a);
  const bMatch = extractSeason(b);
  if (!aMatch || !bMatch) return 0;

  const [aSeason, aNumber] = aMatch;
  const [bSeason, bNumber] = bMatch;

  // First sort by number descending
  if (aNumber !== bNumber) {
    return bNumber - aNumber;
  }

  // Then by season order descending
  return seasonConfig[bSeason].order - seasonConfig[aSeason].order;
}

/**
 * Sort classes by their collection number, per-artist.
 * Welcome is sorted first and Zero last for the sake of consistency.
 */
const classConfigs: Record<ValidArtist, Record<string, number>> = {
  tripleS: {
    Welcome: 1, // 100
    First: 2, // 100
    Special: 3, // 200
    Double: 4, // 300
    Premier: 5, // 400
    Motion: 6, // 500
    Unit: 7, // 600
    Zero: 8, // 000
  },
  artms: {
    Welcome: 1, // 100
    First: 2, // 100
    Special: 3, // 200
    Double: 4, // 300
    Premier: 5, // 400
    Motion: 6, // 500
  },
  idntt: {
    Welcome: 1, // 200
    Basic: 2, // 100
    Event: 3, // 200
    Special: 3, // 300
    Unit: 4, // 400
    Motion: 5, // 500
  },
};

/**
 * Sort classes by their order in the per-artist class config.
 */
export function classSort(a: string, b: string, artist: ValidArtist) {
  const aOrder = classConfigs[artist][a];
  const bOrder = classConfigs[artist][b];
  if (aOrder === undefined || bOrder === undefined) return 0;
  return aOrder - bOrder;
}

/**
 * Parse URLSearchParams into a record.
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const obj: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    if (values.length > 1) {
      obj[key] = values;
    } else if (values.length === 1) {
      obj[key] = values[0]!;
    }
  }
  return obj;
}
