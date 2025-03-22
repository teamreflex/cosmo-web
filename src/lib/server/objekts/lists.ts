import "server-only";
import { db } from "../db";

/**
 * Fetch a single list.
 */
export async function fetchObjektList(userAddress: string, slug: string) {
  return await db.query.lists.findFirst({
    where: {
      slug,
      userAddress,
    },
  });
}
