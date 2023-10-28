import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { lockedObjekts } from "../db/schema";

const fetchLockedObjektsStatement = db
  .select()
  .from(lockedObjekts)
  .where(eq(lockedObjekts.userAddress, sql.placeholder("address")))
  .prepare();

/**
 * Fetch all locked objekts for a given user address.
 * @param userAddress string
 */
export async function fetchLockedObjekts(userAddress: string) {
  const rows = await fetchLockedObjektsStatement.execute({
    address: userAddress,
  });
  return rows.filter((row) => row.locked).map((row) => row.tokenId);
}

/**
 * Toggle the lock on an objekt.
 * @param userAddress string
 * @param tokenId number
 * @param locked boolean
 */
export async function setObjektLock(
  userAddress: string,
  tokenId: number,
  locked: boolean
) {
  if (locked) {
    return await lockObjekt(userAddress, tokenId);
  } else {
    return await unlockObjekt(userAddress, tokenId);
  }
}

/**
 * Lock an objekt.
 * @param userAddress string
 * @param tokenId number
 */
async function lockObjekt(userAddress: string, tokenId: number) {
  // mysql doesn't support ON CONFLICT, so have to run two queries
  const rows = await db
    .select()
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.userAddress, userAddress),
        eq(lockedObjekts.tokenId, tokenId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    const result = await db
      .insert(lockedObjekts)
      .values({ userAddress, tokenId, locked: true });
    return result.rowsAffected === 1;
  }

  const result = await db
    .update(lockedObjekts)
    .set({ locked: true })
    .where(
      and(
        eq(lockedObjekts.userAddress, userAddress),
        eq(lockedObjekts.tokenId, tokenId)
      )
    );
  return result.rowsAffected === 1;
}

/**
 * Unlock an objekt.
 * @param userAddress string
 * @param tokenId number
 */
async function unlockObjekt(userAddress: string, tokenId: number) {
  const result = await db
    .delete(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.userAddress, userAddress),
        eq(lockedObjekts.tokenId, tokenId)
      )
    );
  return result.rowsAffected === 1;
}
