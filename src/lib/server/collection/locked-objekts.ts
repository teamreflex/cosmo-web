import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { lockedObjekts } from "../db/schema";

/**
 * Fetch all locked objekts for a given user address.
 */
export async function fetchLockedObjekts(userAddress: string) {
  const rows = await db
    .select()
    .from(lockedObjekts)
    .where(eq(lockedObjekts.userAddress, userAddress));

  return rows.filter((row) => row.locked).map((row) => row.tokenId);
}

/**
 * Toggle the lock on an objekt.
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
 */
async function lockObjekt(userAddress: string, tokenId: number) {
  const result = await db
    .insert(lockedObjekts)
    .values({ userAddress, tokenId, locked: true })
    .onConflictDoUpdate({
      target: lockedObjekts.tokenId,
      set: { locked: true },
    })
    .returning();

  return result.length === 1;
}

/**
 * Unlock an objekt.
 */
async function unlockObjekt(userAddress: string, tokenId: number) {
  const result = await db
    .delete(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.userAddress, userAddress),
        eq(lockedObjekts.tokenId, tokenId)
      )
    )
    .returning();
  return result.length === 1;
}
