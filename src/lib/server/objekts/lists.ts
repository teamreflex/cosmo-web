import "server-only";
import { db } from "../db";
import { dbi } from "../db/interactive";
import { objektListEntries, objektLists } from "../db/schema";

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
 * Import objekt lists from the old tables into the new ones.
 */
export async function importObjektLists(userId: string, address: string) {
  const lists = await db.query.lists.findMany({
    where: {
      userAddress: address,
    },
    with: {
      entries: true,
    },
  });

  if (lists.length === 0) {
    return;
  }

  await dbi.transaction(async (tx) => {
    // insert the lists
    const result = await tx
      .insert(objektLists)
      .values(
        lists.map((list) => ({
          userId,
          name: list.name,
          slug: list.slug,
        }))
      )
      .returning();

    // build entries
    const entries = [];
    for (const list of lists) {
      const objektList = result.find((r) => r.slug === list.slug);
      if (!objektList) {
        continue;
      }

      for (const entry of list.entries) {
        entries.push({
          objektListId: objektList.id,
          collectionId: entry.collectionId,
        });
      }
    }

    if (entries.length === 0) {
      return;
    }

    // insert entries
    await tx.insert(objektListEntries).values(entries);
  });
}
