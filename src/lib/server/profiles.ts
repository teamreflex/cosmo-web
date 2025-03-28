import { db } from "./db";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  // fetch known profiles
  return await db.query.profiles.findMany({
    where: {
      userAddress: {
        in: addresses,
      },
    },
    columns: {
      userAddress: true,
      nickname: true,
    },
  });
}
