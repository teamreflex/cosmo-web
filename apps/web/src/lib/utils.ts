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
 * Colors for each season.
 */
const seasonColors: Record<string, string> = {
  atom: "#FFDD00",
  binary: "#75FB4C",
  cream: "#FF7477",
  divine: "#B400FF",
  ever: "#33ecfd",
  summer: "#619AFF",
  autumn: "#B5315A",
  winter: "#C6C6C6",
  spring: "#FFE527",
};

/**
 * Get the color for a season.
 */
export function getSeasonColor(season: string) {
  const match = season.match(/^([a-zA-Z]+)/);
  if (!match || !match[1]) return null;

  const seasonName = match[1].toLowerCase();
  return seasonColors[seasonName] || null;
}
