import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { lockedObjekts } from "../db/schema";

/**
 * Toggle the lock on an objekt.
 */
export async function setObjektLock(
  address: string,
  tokenId: number,
  locked: boolean
) {
  if (locked) {
    return await lockObjekt(address, tokenId);
  } else {
    return await unlockObjekt(address, tokenId);
  }
}

/**
 * Lock an objekt.
 */
async function lockObjekt(address: string, tokenId: number) {
  const result = await db
    .insert(lockedObjekts)
    .values({ address, tokenId, locked: true })
    .returning();

  return result.length === 1;
}

/**
 * Unlock an objekt.
 */
async function unlockObjekt(address: string, tokenId: number) {
  const result = await db
    .delete(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.address, address),
        eq(lockedObjekts.tokenId, tokenId)
      )
    )
    .returning();

  return result.length === 1;
}
