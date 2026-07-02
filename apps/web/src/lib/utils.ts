import type { ValidArtist } from "@apollo/cosmo/types/common";
import * as z from "zod";
import { env } from "./env/client";

export { cn } from "cnfast";

export type PropsWithClassName<T> = T & { className?: string };

/**
 * Get the base URL for the app.
 */
export function baseUrl() {
  const scheme = env.VITE_APP_ENV === "development" ? "http" : "https";
  return `${scheme}://${env.VITE_BASE_URL}`;
}

/**
 * Format a price in the given currency. Falls back to a manual format string
 * when the currency code is not recognized by `Intl.NumberFormat` (we allow
 * freeform currency input on objekt lists).
 */
export function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString("en", { maximumFractionDigits: 2 })} ${currency}`;
  }
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

export { getSeasonColor, seasonSort } from "./universal/seasons";

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

const handles = [
  "0ct0ber19",
  "withaseul",
  "kimxxlip",
  "zindoriyam",
  "cher_ryppo",
];
export function randomHandle() {
  return handles[Math.floor(Math.random() * handles.length)];
}
