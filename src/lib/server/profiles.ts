import { SQL } from "drizzle-orm";
import { db } from "./db";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[], privacy: SQL[]) {
  if (addresses.length === 0) return [];

  if (privacy.length === 0) {
    throw new Error("No privacy filters provided");
  }

  // fetch known profiles
  const results = await db.query.profiles.findMany({
    where: (profiles, { and, inArray }) =>
      and(...privacy, inArray(profiles.userAddress, addresses)),
  });

  // uses the latest profile for each address instead of the first
  return results.filter((profile, _, arr) => {
    return !arr.some(
      (p) => p.userAddress === profile.userAddress && p.id > profile.id
    );
  });
}
