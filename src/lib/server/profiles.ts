import { SQL, and, inArray } from "drizzle-orm";
import { db } from "./db";
import { profiles } from "./db/schema";
import { getCookie } from "./cookies";
import { ValidArtist } from "../universal/cosmo/common";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[], privacy: SQL[]) {
  if (addresses.length === 0) return [];

  if (privacy.length === 0) {
    throw new Error("No privacy filters provided");
  }

  // fetch known profiles
  const results = await db
    .select()
    .from(profiles)
    .where(and(...privacy, inArray(profiles.userAddress, addresses)));

  // uses the latest profile for each address instead of the first
  return results.filter((profile, _, arr) => {
    return !arr.some(
      (p) => p.userAddress === profile.userAddress && p.id > profile.id
    );
  });
}

/**
 * Gets the current selected artist via cookies.
 */
export function getSelectedArtist() {
  return getCookie<ValidArtist>("artist") ?? "artms";
}
