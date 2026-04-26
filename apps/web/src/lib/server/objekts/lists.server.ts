import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

type WebTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | WebTx;

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

  await db.transaction(async (tx) => {
    // insert the lists
    const result = await tx
      .insert(objektLists)
      .values(
        // ensure there's no slug or name collision
        lists.map((list) => {
          const name =
            list.name.length > 22 ? list.name.slice(0, 22) : list.name;
          const slug =
            list.slug.length > 22 ? list.slug.slice(0, 22) : list.slug;

          return {
            userId,
            name: `${name} 2`,
            slug: `${slug}-2`,
          };
        }),
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

/**
 * Throws unless the given user owns the given list. Accepts either the bare
 * connection or a transaction so callers inside a tx run the check on the
 * same snapshot as their writes.
 */
export async function assertUserOwnsList(
  id: string,
  userId: string,
  conn: DbOrTx = db,
) {
  const count = await conn.$count(
    objektLists,
    and(eq(objektLists.id, id), eq(objektLists.userId, userId)),
  );

  if (count === 0) {
    throw new Error("You do not have access to this list");
  }
}
