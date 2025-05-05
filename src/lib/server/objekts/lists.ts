import "server-only";
import { db } from "../db";

/**
 * Fetch a single objekt list.
 */
export async function fetchObjektList(userId: string, slug: string) {
  return await db.query.objektLists.findFirst({
    where: {
      userId,
      slug,
    },
  });
}

/**
 * Fetch all objekt lists for a user.
 */
export async function fetchObjektLists(userId: string) {
  return await db.query.objektLists.findMany({
    where: { userId },
  });
}
