import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PublicProfile } from "./universal/cosmo/auth";
import { env } from "@/env.mjs";
import { CosmoPollChoices, CosmoPollUpcoming } from "./universal/cosmo/gravity";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PropsWithClassName<T> = T & { className?: string };

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Address compare, because those in PG are forced to lowercase.
 */
export function isAddressEqual(a?: string, b?: string) {
  return a?.toLowerCase() === b?.toLowerCase();
}

/**
 * default grid columns
 */
export const GRID_COLUMNS = 5;

/**
 * Default {@link PublicProfile} properties.
 */
export const defaultProfile: PublicProfile = {
  address: "",
  nickname: "",
  profileImageUrl: "",
  isAddress: true,
  artist: "artms",
  privacy: {
    nickname: false,
    objekts: false,
    como: false,
    trades: false,
  },
  gridColumns: GRID_COLUMNS,
  isObjektEditor: false,
};

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Track an event with Umami.
 * Handles when the tracking script isn't loaded.
 */
export function track(event: string) {
  try {
    umami.track(event);
  } catch (err) {
    // ignore
  }
}

/**
 * Get the base URL for the app.
 */
export function baseUrl() {
  const scheme =
    env.NEXT_PUBLIC_VERCEL_ENV === "development" ? "http" : "https";
  return `${scheme}://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
}

/**
 * Determines the status of a gravity poll.
 */
export function getPollStatus(poll: CosmoPollChoices | CosmoPollUpcoming) {
  const now = new Date();

  if (new Date(poll.endDate) <= now) {
    return poll.finalized ? "finalized" : "counting";
  }

  if (new Date(poll.startDate) >= now) {
    return "upcoming";
  }

  return "ongoing";
}

/**
 * Tailwind v4 doesn't support safelist, so classes need to be explicitly visible.
 */
export const gridColumnMap: Record<number, string> = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
  7: "md:grid-cols-7",
  8: "md:grid-cols-8",
};
