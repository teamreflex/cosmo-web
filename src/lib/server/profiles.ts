import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { profiles } from "./db/schema";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  // fetch known profiles
  const results = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.privacyTrades, false),
        inArray(profiles.userAddress, addresses)
      )
    );

  // uses the latest profile for each address instead of the first
  return results.filter((profile, _, arr) => {
    return !arr.some(
      (p) => p.userAddress === profile.userAddress && p.id > profile.id
    );
  });
}
