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
