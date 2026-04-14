import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { assertUserOwnsList } from "@/lib/server/objekts/lists.server";
import {
  addObjektToListSchema,
  addObjektToLiveListSchema,
  addObjektToSaleListSchema,
  createObjektListSchema,
  deleteObjektListSchema,
  findTradePartnersSchema,
  generateDiscordListSchema,
  removeObjektFromListSchema,
  updateObjektListEntrySchema,
  updateObjektListSchema,
} from "@/lib/universal/schema/objekt-list";
import { sanitizeUuid } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import {
  cosmoAccounts,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import type { ObjektListEntry } from "@apollo/database/web/types";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, countDistinct, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";
import { $fetchArtists } from "./artists";
import {
  assertOwnsCollection,
  fireHaveAddNotifications,
  fireWantAddNotifications,
} from "./lists.server";

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

function createSlug(name: string) {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
 * Create a new objekt list.
 */
export const $createObjektList = createServerFn({ method: "POST" })
  .inputValidator(createObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "regular") {
      throw new Error("Use $createLiveList for have/want lists.");
    }

    const slug = createSlug(data.name);

    const existing = await $fetchObjektList({
      data: {
        userId: context.session.session.userId,
        slug,
      },
    });
    if (existing !== undefined) {
      throw new Error("You already have a list with this name");
    }

    const [result] = await db
      .insert(objektLists)
      .values({
        name: data.name,
        slug,
        currency: data.currency ?? null,
        description: data.description ?? null,
        type: "regular",
        userId: context.session.session.userId,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create list");
    }

    return result;
  });

/**
 * Create a have/want live list. Requires a linked COSMO account because the
 * drain and ownership-verification paths both rely on `context.cosmo.address`.
 * If `pairListId` is set, the new list is linked to the opposite-type list
 * within the same transaction.
 */
export const $createLiveList = createServerFn({ method: "POST" })
  .inputValidator(createObjektListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type === "regular") {
      throw new Error("Use $createObjektList for regular lists.");
    }

    const userId = context.session.user.id;
    const slug = createSlug(data.name);

    const existing = await $fetchObjektList({
      data: { userId, slug },
    });
    if (existing !== undefined) {
      throw new Error("You already have a list with this name");
    }

    if (data.pairListId !== null) {
      const targetType = data.type === "have" ? "want" : "have";
      const target = await db.query.objektLists.findFirst({
        where: { id: data.pairListId, userId, type: targetType },
        columns: { id: true, linkedWantListId: true },
      });
      if (!target) {
        throw new Error(`Not a ${targetType} list`);
      }

      if (data.type === "have") {
        const alreadyLinked = await db.query.objektLists.findFirst({
          where: { userId, type: "have", linkedWantListId: data.pairListId },
          columns: { id: true },
        });
        if (alreadyLinked) {
          throw new Error(
            "That want list is already linked to another have list",
          );
        }
      } else if (target.linkedWantListId !== null) {
        throw new Error(
          "That have list is already linked to another want list",
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(objektLists)
        .values({
          name: data.name,
          slug,
          currency: null,
          description: data.description ?? null,
          type: data.type,
          discoverable: data.discoverable,
          linkedWantListId: data.type === "have" ? data.pairListId : null,
          userId,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create list");
      }

      if (data.type === "want" && data.pairListId !== null) {
        await tx
          .update(objektLists)
          .set({ linkedWantListId: row.id })
          .where(
            and(
              eq(objektLists.id, data.pairListId),
              eq(objektLists.userId, userId),
            ),
          );
      }

      return row;
    });

    return result;
  });

/**
 * Update an objekt list (regular variant only — never touches discoverable or type).
 */
export const $updateObjektList = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "regular") {
      throw new Error("Use $updateLiveList for have/want lists.");
    }

    const existingRow = await db.query.objektLists.findFirst({
      where: {
        id: data.id,
        userId: context.session.session.userId,
      },
      columns: { type: true },
    });
    if (!existingRow) {
      throw new Error("List not found");
    }
    if (existingRow.type !== "regular") {
      throw new Error("Cannot change list type after creation");
    }

    const slug = createSlug(data.name);

    const conflict = await db.query.objektLists.findFirst({
      where: {
        slug,
        userId: context.session.session.userId,
        id: { ne: data.id },
      },
    });
    if (conflict !== undefined) {
      throw new Error("You already have a list with this name");
    }

    const [result] = await db
      .update(objektLists)
      .set({
        name: data.name,
        slug,
        currency: data.currency ?? null,
        description: data.description ?? null,
      })
      .where(
        and(
          eq(objektLists.id, data.id),
          eq(objektLists.userId, context.session.session.userId),
        ),
      )
      .returning();

    if (!result) {
      throw new Error("Failed to update list");
    }

    const cosmo = await db.query.cosmoAccounts.findFirst({
      where: { userId: context.session.session.userId },
    });

    if (cosmo) {
      throw redirect({
        to: "/@{$username}/list/$slug",
        params: { username: cosmo.username, slug: result.slug },
      });
    }

    throw redirect({ to: `/list/$id`, params: { id: result.id } });
  });

/**
 * Update a have/want live list (name/description/discoverable/pair) in a single
 * transaction. Type cannot change after creation. For have lists the pair FK is
 * on the edited row; for want lists it lives on the linking have list, so the
 * transaction also touches that row.
 */
export const $updateLiveList = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type === "regular") {
      throw new Error("Use $updateObjektList for regular lists.");
    }

    const userId = context.session.user.id;

    const existingRow = await db.query.objektLists.findFirst({
      where: { id: data.id, userId },
      columns: { type: true },
    });
    if (!existingRow) {
      throw new Error("List not found");
    }
    if (existingRow.type !== data.type) {
      throw new Error("Cannot change list type after creation");
    }

    const slug = createSlug(data.name);

    const conflict = await db.query.objektLists.findFirst({
      where: { slug, userId, id: { ne: data.id } },
    });
    if (conflict !== undefined) {
      throw new Error("You already have a list with this name");
    }

    if (data.pairListId !== null) {
      const targetType = data.type === "have" ? "want" : "have";
      const target = await db.query.objektLists.findFirst({
        where: { id: data.pairListId, userId, type: targetType },
        columns: { id: true, linkedWantListId: true },
      });
      if (!target) {
        throw new Error(`Not a ${targetType} list`);
      }

      if (data.type === "have") {
        const alreadyLinked = await db.query.objektLists.findFirst({
          where: {
            userId,
            type: "have",
            linkedWantListId: data.pairListId,
            id: { ne: data.id },
          },
          columns: { id: true },
        });
        if (alreadyLinked) {
          throw new Error(
            "That want list is already linked to another have list",
          );
        }
      } else if (
        target.linkedWantListId !== null &&
        target.linkedWantListId !== data.id
      ) {
        throw new Error(
          "That have list is already linked to another want list",
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const baseUpdate = {
        name: data.name,
        slug,
        description: data.description ?? null,
        discoverable: data.discoverable,
      };

      const [row] = await tx
        .update(objektLists)
        .set(
          data.type === "have"
            ? { ...baseUpdate, linkedWantListId: data.pairListId }
            : baseUpdate,
        )
        .where(and(eq(objektLists.id, data.id), eq(objektLists.userId, userId)))
        .returning();

      if (!row) {
        throw new Error("Failed to update list");
      }

      if (data.type === "want") {
        const currentHave = await tx.query.objektLists.findFirst({
          where: { userId, type: "have", linkedWantListId: data.id },
          columns: { id: true },
        });
        const currentPairId = currentHave?.id ?? null;

        if (data.pairListId !== currentPairId) {
          if (currentHave) {
            await tx
              .update(objektLists)
              .set({ linkedWantListId: null })
              .where(eq(objektLists.id, currentHave.id));
          }
          if (data.pairListId !== null) {
            await tx
              .update(objektLists)
              .set({ linkedWantListId: data.id })
              .where(eq(objektLists.id, data.pairListId));
          }
        }
      }

      return row;
    });

    throw redirect({
      to: "/@{$username}/list/$slug",
      params: { username: context.cosmo.username, slug: result.slug },
    });
  });

/**
 * Delete an objekt list.
 */
export const $deleteObjektList = createServerFn({ method: "POST" })
  .inputValidator(deleteObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .delete(objektLists)
      .where(
        and(
          eq(objektLists.id, data.id),
          eq(objektLists.userId, context.session.session.userId),
        ),
      );

    throw redirect({ to: "/" });
  });

/**
 * Add an objekt to a list
 */
export const $addObjektToList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    await db.insert(objektListEntries).values({
      objektListId: data.objektListId,
      collectionId: data.collectionSlug,
    });

    return true;
  });

/**
 * Add an objekt to a sale list with quantity/price, upserting if already present.
 */
export const $addObjektToSaleList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToSaleListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    const existing = await db.query.objektListEntries.findFirst({
      where: {
        objektListId: data.objektListId,
        collectionId: data.collectionSlug,
      },
    });

    if (existing) {
      await db
        .update(objektListEntries)
        .set({
          quantity: existing.quantity + data.quantity,
          price: data.price ?? existing.price,
        })
        .where(eq(objektListEntries.id, existing.id));
    } else {
      await db.insert(objektListEntries).values({
        objektListId: data.objektListId,
        collectionId: data.collectionSlug,
        quantity: data.quantity,
        price: data.price ?? null,
      });
    }

    return true;
  });

/**
 * Add an objekt to a have list. Verifies ownership against the indexer using
 * the user's COSMO address. If the list is trade-active and discoverable, fires
 * mutual-viability notifications to other users with matching want lists.
 */
export const $addObjektToHaveList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToLiveListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await assertUserOwnsList(data.objektListId, userId);

    const parentList = await db.query.objektLists.findFirst({
      where: { id: data.objektListId },
      columns: { type: true, discoverable: true, linkedWantListId: true },
    });
    if (parentList?.type !== "have") {
      throw new Error("Not a have list");
    }

    await assertOwnsCollection(context.cosmo.address, data.collectionSlug);

    // a collection may appear at most once across the user's *linked* have
    // lists, so the drain has exactly one target per (user, collection).
    // unlinked archive lists are unconstrained.
    if (parentList.linkedWantListId !== null) {
      const conflict = await db.query.objektListEntries.findFirst({
        where: {
          collectionId: data.collectionSlug,
          objektList: {
            userId,
            type: "have",
            linkedWantListId: { isNotNull: true },
            id: { ne: data.objektListId },
          },
        },
        columns: { id: true },
      });
      if (conflict) {
        throw new Error(
          `${data.collectionSlug} is already on another of your linked have lists. Remove it there first.`,
        );
      }
    }

    await db.transaction(async (tx) => {
      const existing = await tx.query.objektListEntries.findFirst({
        where: {
          objektListId: data.objektListId,
          collectionId: data.collectionSlug,
        },
      });

      if (existing) {
        await tx
          .update(objektListEntries)
          .set({
            quantity: existing.quantity + 1,
            verifiedAt: new Date().toISOString(),
          })
          .where(eq(objektListEntries.id, existing.id));
      } else {
        await tx.insert(objektListEntries).values({
          objektListId: data.objektListId,
          collectionId: data.collectionSlug,
          quantity: 1,
          verifiedAt: new Date().toISOString(),
        });
      }

      if (parentList.discoverable && parentList.linkedWantListId !== null) {
        await fireHaveAddNotifications(tx, {
          sourceUserId: userId,
          sourceListId: data.objektListId,
          collectionId: data.collectionSlug,
        });
      }
    });

    return true;
  });

/**
 * Add an objekt to a want list. Skips ownership verification (you can want
 * anything). Fires mutual-viability notifications to other users when the
 * list is trade-active and discoverable.
 */
export const $addObjektToWantList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToLiveListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await assertUserOwnsList(data.objektListId, userId);

    const parentList = await db.query.objektLists.findFirst({
      where: { id: data.objektListId },
      columns: { type: true, discoverable: true, id: true },
    });
    if (parentList?.type !== "want") {
      throw new Error("Not a want list");
    }

    // trade-active for a want list = some have list of mine links to it
    const linkingHave = await db.query.objektLists.findFirst({
      where: { linkedWantListId: parentList.id, userId },
      columns: { id: true },
    });
    const isTradeActive = linkingHave !== undefined;

    await db.transaction(async (tx) => {
      const existing = await tx.query.objektListEntries.findFirst({
        where: {
          objektListId: data.objektListId,
          collectionId: data.collectionSlug,
        },
      });

      if (existing) {
        await tx
          .update(objektListEntries)
          .set({ quantity: existing.quantity + 1 })
          .where(eq(objektListEntries.id, existing.id));
      } else {
        await tx.insert(objektListEntries).values({
          objektListId: data.objektListId,
          collectionId: data.collectionSlug,
          quantity: 1,
        });
      }

      if (parentList.discoverable && isTradeActive) {
        await fireWantAddNotifications(tx, {
          sourceUserId: userId,
          sourceListId: data.objektListId,
          collectionId: data.collectionSlug,
        });
      }
    });

    return true;
  });

/**
 * Update quantity/price on an existing list entry.
 */
export const $updateObjektListEntry = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListEntrySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    await db
      .update(objektListEntries)
      .set({
        quantity: data.quantity,
        price: data.price ?? null,
      })
      .where(
        and(
          eq(objektListEntries.id, data.objektListEntryId),
          eq(objektListEntries.objektListId, data.objektListId),
        ),
      );

    return true;
  });

/**
 * Remove an objekt from a list
 */
export const $removeObjektFromList = createServerFn({ method: "POST" })
  .inputValidator(removeObjektFromListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    await db
      .delete(objektListEntries)
      .where(
        and(
          eq(objektListEntries.objektListId, data.objektListId),
          eq(objektListEntries.id, data.objektListEntryId),
        ),
      );

    return true;
  });

export type TradePartner = {
  theirUserId: string;
  theirUsername: string | null;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
  descriptions: string[];
};

/**
 * Find trade partners for a single live list. Surfaces only mutual matches:
 * the partner must hold something in this anchor (or want it, depending on
 * anchor type) AND must want something the current user already holds (or
 * holds something the current user wants). Anchor must be trade-active.
 */
export const $findTradePartnersForList = createServerFn({ method: "GET" })
  .inputValidator(findTradePartnersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TradePartner[]> => {
    const userId = context.session.session.userId;

    const myList = await db.query.objektLists.findFirst({
      where: { id: data.listId, userId },
      columns: {
        id: true,
        type: true,
        userId: true,
        linkedWantListId: true,
      },
      with: {
        linkingHaveList: { columns: { id: true } },
      },
    });
    if (!myList || (myList.type !== "have" && myList.type !== "want")) {
      throw new Error("Not a live list");
    }

    const anchorIsActive =
      myList.type === "have"
        ? myList.linkedWantListId !== null
        : myList.linkingHaveList !== null;
    if (!anchorIsActive) {
      throw new Error(
        "Pair this list with the opposite type to find trade partners",
      );
    }

    // The anchor side scopes one direction of the mutual check; the other
    // direction considers the union of all the user's discoverable lists of
    // the opposite type. CTEs materialise the trade-active list sets; the
    // body swaps roles based on anchor type.
    const w = alias(objektLists, "w");
    const h = alias(objektLists, "h");

    const tradeActiveHaves = db.$with("trade_active_haves").as(
      db
        .select({
          id: objektLists.id,
          userId: objektLists.userId,
          description: objektLists.description,
        })
        .from(objektLists)
        .where(
          and(
            eq(objektLists.type, "have"),
            eq(objektLists.discoverable, true),
            isNotNull(objektLists.linkedWantListId),
          ),
        ),
    );

    const tradeActiveWants = db.$with("trade_active_wants").as(
      db
        .select({
          id: w.id,
          userId: w.userId,
          description: w.description,
        })
        .from(w)
        .innerJoin(h, eq(h.linkedWantListId, w.id))
        .where(and(eq(w.type, "want"), eq(w.discoverable, true))),
    );

    const myAnchorCollections = db
      .$with("my_anchor_collections")
      .as(
        db
          .select({ collectionId: objektListEntries.collectionId })
          .from(objektListEntries)
          .where(eq(objektListEntries.objektListId, data.listId)),
      );

    let rows: TradePartner[] = [];

    switch (myList.type) {
      case "want": {
        const myHaves = db
          .$with("my_haves")
          .as(
            db
              .selectDistinct({ collectionId: objektListEntries.collectionId })
              .from(objektListEntries)
              .innerJoin(
                tradeActiveHaves,
                eq(tradeActiveHaves.id, objektListEntries.objektListId),
              )
              .where(eq(tradeActiveHaves.userId, userId)),
          );

        const theirHaves = db.$with("their_haves").as(
          db
            .select({
              userId: tradeActiveHaves.userId,
              description: tradeActiveHaves.description,
              collectionId: objektListEntries.collectionId,
            })
            .from(objektListEntries)
            .innerJoin(
              tradeActiveHaves,
              eq(tradeActiveHaves.id, objektListEntries.objektListId),
            )
            .innerJoin(
              myAnchorCollections,
              eq(
                myAnchorCollections.collectionId,
                objektListEntries.collectionId,
              ),
            )
            .where(ne(tradeActiveHaves.userId, userId)),
        );

        const theirWants = db.$with("their_wants").as(
          db
            .select({
              userId: tradeActiveWants.userId,
              description: tradeActiveWants.description,
              collectionId: objektListEntries.collectionId,
            })
            .from(objektListEntries)
            .innerJoin(
              tradeActiveWants,
              eq(tradeActiveWants.id, objektListEntries.objektListId),
            )
            .innerJoin(
              myHaves,
              eq(myHaves.collectionId, objektListEntries.collectionId),
            )
            .where(ne(tradeActiveWants.userId, userId)),
        );

        const result = await db
          .with(
            tradeActiveHaves,
            tradeActiveWants,
            myAnchorCollections,
            myHaves,
            theirHaves,
            theirWants,
          )
          .select({
            theirUserId: theirHaves.userId,
            theirUsername: cosmoAccounts.username,
            theyHaveIWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirHaves.collectionId})`,
            iHaveTheyWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirWants.collectionId})`,
            descriptions: sql<string[] | null>`array_remove(
              array_agg(DISTINCT ${theirHaves.description}) ||
              array_agg(DISTINCT ${theirWants.description}),
              NULL
            )`,
          })
          .from(theirHaves)
          .innerJoin(theirWants, eq(theirWants.userId, theirHaves.userId))
          .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, theirHaves.userId))
          .groupBy(theirHaves.userId, cosmoAccounts.username)
          .orderBy(desc(countDistinct(theirHaves.collectionId)))
          .limit(50);

        rows = result.map((r) => ({
          theirUserId: r.theirUserId,
          theirUsername: r.theirUsername,
          theyHaveIWant: r.theyHaveIWant ?? [],
          iHaveTheyWant: r.iHaveTheyWant ?? [],
          descriptions: r.descriptions ?? [],
        }));
        break;
      }

      case "have": {
        const myWants = db
          .$with("my_wants")
          .as(
            db
              .selectDistinct({ collectionId: objektListEntries.collectionId })
              .from(objektListEntries)
              .innerJoin(
                tradeActiveWants,
                eq(tradeActiveWants.id, objektListEntries.objektListId),
              )
              .where(eq(tradeActiveWants.userId, userId)),
          );

        const theirWants = db.$with("their_wants").as(
          db
            .select({
              userId: tradeActiveWants.userId,
              description: tradeActiveWants.description,
              collectionId: objektListEntries.collectionId,
            })
            .from(objektListEntries)
            .innerJoin(
              tradeActiveWants,
              eq(tradeActiveWants.id, objektListEntries.objektListId),
            )
            .innerJoin(
              myAnchorCollections,
              eq(
                myAnchorCollections.collectionId,
                objektListEntries.collectionId,
              ),
            )
            .where(ne(tradeActiveWants.userId, userId)),
        );

        const theirHaves = db.$with("their_haves").as(
          db
            .select({
              userId: tradeActiveHaves.userId,
              description: tradeActiveHaves.description,
              collectionId: objektListEntries.collectionId,
            })
            .from(objektListEntries)
            .innerJoin(
              tradeActiveHaves,
              eq(tradeActiveHaves.id, objektListEntries.objektListId),
            )
            .innerJoin(
              myWants,
              eq(myWants.collectionId, objektListEntries.collectionId),
            )
            .where(ne(tradeActiveHaves.userId, userId)),
        );

        const result = await db
          .with(
            tradeActiveHaves,
            tradeActiveWants,
            myAnchorCollections,
            myWants,
            theirWants,
            theirHaves,
          )
          .select({
            theirUserId: theirWants.userId,
            theirUsername: cosmoAccounts.username,
            theyHaveIWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirHaves.collectionId})`,
            iHaveTheyWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirWants.collectionId})`,
            descriptions: sql<string[] | null>`array_remove(
              array_agg(DISTINCT ${theirWants.description}) ||
              array_agg(DISTINCT ${theirHaves.description}),
              NULL
            )`,
          })
          .from(theirWants)
          .innerJoin(theirHaves, eq(theirHaves.userId, theirWants.userId))
          .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, theirWants.userId))
          .groupBy(theirWants.userId, cosmoAccounts.username)
          .orderBy(desc(countDistinct(theirWants.collectionId)))
          .limit(50);

        rows = result.map((r) => ({
          theirUserId: r.theirUserId,
          theirUsername: r.theirUsername,
          theyHaveIWant: r.theyHaveIWant ?? [],
          iHaveTheyWant: r.iHaveTheyWant ?? [],
          descriptions: r.descriptions ?? [],
        }));
        break;
      }
    }

    return rows;
  });

/**
 * Generate a Discord have/want list.
 */
export const $generateDiscordList = createServerFn({ method: "POST" })
  .inputValidator(generateDiscordListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // fetch lists and associated entries
    const lists = await db.query.objektLists.findMany({
      where: {
        id: {
          in: [data.haveId, data.wantId],
        },
        userId: context.session.session.userId,
      },
      with: {
        entries: true,
      },
    });

    const have = lists.find((l) => l.id === data.haveId);
    const want = lists.find((l) => l.id === data.wantId);

    if (!have || !want) {
      throw new Error("Please select both lists.");
    }

    // fetch collections from the indexer
    const unique = new Set([
      ...have.entries.map((e) => e.collectionId),
      ...want.entries.map((e) => e.collectionId),
    ]);

    if (unique.size === 0) {
      throw new Error("Please select lists that are not empty");
    }

    const collections = await indexer.query.collections.findMany({
      where: {
        slug: {
          in: Array.from(unique),
        },
      },
      columns: {
        slug: true,
        season: true,
        collectionNo: true,
        member: true,
        artist: true,
      },
    });

    // get artists for member ordering
    const { artists } = await $fetchArtists();
    const artistsArray = Object.values(artists);

    // map into discord format
    const haveCollections = format(
      collections,
      have.entries,
      artistsArray,
      have.currency,
    );
    const wantCollections = format(
      collections,
      want.entries,
      artistsArray,
      want.currency,
    );

    const result = [
      "Have:",
      haveCollections.join("\n"),
      "",
      "Want:",
      wantCollections.join("\n"),
    ].join("\n");

    return result;
  });

type CollectionSubset = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo" | "artist"
>;

type CollectionWithEntry = CollectionSubset & {
  quantity?: number;
  price?: number | null;
};

/**
 * Formats a list of collections for a single member.
 */
function formatMemberCollections(
  collections: CollectionWithEntry[],
  currency: string | null,
): string {
  return collections
    .map((c) => {
      let label: string;
      if (c.artist === "idntt") {
        label = `${c.season} ${c.collectionNo}`;
      } else {
        const match = c.season.match(/([A-Za-z]+)(\d+)/);
        if (!match) {
          label = `${c.season.at(0)}${c.collectionNo}`;
        } else {
          const [, seasonText, seasonNum] = match;
          const firstLetter = seasonText?.at(0) ?? "";
          const seasonPart = firstLetter.repeat(parseInt(seasonNum ?? "0", 10));
          label = `${seasonPart}${c.collectionNo}`;
        }
      }

      if (currency && c.quantity !== undefined) {
        const qty = c.quantity > 1 ? ` x${c.quantity}` : "";
        const price =
          c.price != null
            ? ` (${c.price.toLocaleString("en")} ${currency})`
            : "";
        return `${label}${qty}${price}`;
      }
      return label;
    })
    .sort()
    .join(", ");
}

/**
 * Format a list of collections and entries into a string, grouped and sorted by member.
 */
function format(
  collections: CollectionSubset[],
  entries: ObjektListEntry[],
  artists: CosmoArtistWithMembersBFF[],
  currency: string | null,
): string[] {
  // create a map for quick collection lookup by slug
  const collectionsMap = new Map(collections.map((c) => [c.slug, c]));

  // create member order map maintaining artist grouping for sorting
  const memberOrderMap: Record<string, number> = {};
  artists.forEach((artist, artistIndex) => {
    artist.artistMembers.forEach((member) => {
      memberOrderMap[member.name] = (artistIndex + 1) * 1000 + member.order;
    });
  });

  // group collections by member, carrying entry metadata
  const groupedCollectionsByMember = new Map<string, CollectionWithEntry[]>();
  for (const entry of entries) {
    const collection = collectionsMap.get(entry.collectionId);
    if (collection) {
      const memberCollections =
        groupedCollectionsByMember.get(collection.member) ?? [];
      memberCollections.push({
        ...collection,
        quantity: entry.quantity,
        price: entry.price,
      });
      groupedCollectionsByMember.set(collection.member, memberCollections);
    }
  }

  // sort members based on the order map
  return Array.from(groupedCollectionsByMember.entries())
    .sort(([memberA], [memberB]) => {
      const orderA = memberOrderMap[memberA] ?? Number.MAX_SAFE_INTEGER;
      const orderB = memberOrderMap[memberB] ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map(([member, memberCollections]) => {
      const formattedCollections = formatMemberCollections(
        memberCollections,
        currency,
      );
      return `${member} ${formattedCollections}`;
    });
}
