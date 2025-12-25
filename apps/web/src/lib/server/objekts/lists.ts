import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import * as z from "zod";
import { redirect } from "@tanstack/react-router";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import { db } from "../db";
import { sanitizeUuid } from "@/lib/utils";

/**
 * Fetch a single objekt list.
 */
export const $fetchObjektList = createServerFn({ method: "GET" })
  .inputValidator(
    z.union([
      z.object({ id: z.string() }),
      z.object({ userId: z.string(), slug: z.string() }),
    ]),
  )
  .handler(async ({ data }) => {
    return await db.query.objektLists.findFirst({ where: data });
  });

/**
 * Fetch a single objekt list with the user.
 */
export const $getObjektListWithUser = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sanitized = sanitizeUuid(data.id);
    if (!sanitized) {
      return undefined;
    }

    if (data.id !== sanitized) {
      throw redirect({ to: "/list/$id", params: { id: sanitized } });
    }

    return await db.query.objektLists.findFirst({
      where: { id: sanitized },
      with: {
        user: {
          columns: {
            id: true,
          },
          with: {
            cosmoAccount: {
              columns: {
                username: true,
              },
            },
          },
        },
      },
    });
  });

/**
 * Import objekt lists from the old tables into the new ones.
 */
export const importObjektLists = createServerOnlyFn(
  async (userId: string, address: string) => {
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
  },
);
