import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PublicProfile } from "./universal/cosmo/auth";
import { env } from "@/env";
import { ValidArtist } from "./universal/cosmo/common";

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
 * Necessary due to archives returning addresses in lowercase.
 */
export const addr = (address: string) => address.toLowerCase();

/**
 * default grid columns
 */
export const GRID_COLUMNS = 5;

/**
 * Collection data source.
 */
export const collectionDataSources = [
  "cosmo",
  "blockchain",
  "blockchain-groups",
] as const;
export type CollectionDataSource = (typeof collectionDataSources)[number];
export type FilterType = "remote" | "local";

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
    votes: true,
  },
  gridColumns: GRID_COLUMNS,
  isObjektEditor: false,
  dataSource: "cosmo",
  isModhaus: false,
  isAbstract: false,
};

/**
 * Addresses that may need special handling.
 */
export const Addresses = {
  NULL: addr("0x0000000000000000000000000000000000000000"),
  SPIN: addr("0xD3D5f29881ad87Bb10C1100e2c709c9596dE345F"),
  OBJEKT: addr("0x99Bb83AE9bb0C0A6be865CaCF67760947f91Cb70"),
  COMO: addr("0xd0EE3ba23a384A8eeFd43f33A957dED60eD12706"),
  GRAVITY: addr("0xF1A787da84af2A6e8227aD87112a21181B7b9b39"),
};

/**
 * Track an event with Umami.
 * Handles when the tracking script isn't loaded.
 */
export function track(event: string) {
  try {
    window.umami.track(event);
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
 * Objekt border colors for each artist, based on 1st gen fanclub colors.
 * Used for member filter buttons.
 */
export const artistColors: Record<ValidArtist, string> = {
  tripleS: "#8ebdd1",
  artms: "#D5B7E2",
};

/**
 * Chunk an array into chunks of a given size.
 */
export async function chunk<T>(
  arr: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void>
) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    await callback(chunk);
  }
}

/**
 * Safe conversion of a crypto-formatted bigint to a number.
 */
export function safeBigInt(value: bigint) {
  return Number(value / BigInt(10 ** 18));
}
