import "server-only";
import { db } from "../db";

/**
 * Fetch a single list.
 */
export async function fetchObjektList(address: string, slug: string) {
  return await db.query.lists.findFirst({
    where: (lists, { and, eq }) =>
      and(eq(lists.slug, slug), eq(lists.userAddress, address)),
  });
}
