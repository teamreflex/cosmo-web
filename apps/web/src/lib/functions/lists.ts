import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { fetchLatestFxRate } from "@/lib/server/objekts/fx.server";
import { assertUserOwnsList } from "@/lib/server/objekts/lists.server";
import type { PublicUser } from "@/lib/universal/auth";
import type {
  PartnerMatchRow,
  TradePartner,
  TradePartnersResponse,
} from "@/lib/universal/lists";
import { Objekt } from "@/lib/universal/objekt-conversion";
import {
  addObjektToHaveListSchema,
  addObjektToListSchema,
  addObjektToSaleListSchema,
  addObjektToWantListSchema,
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
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import type { ObjektListEntry } from "@apollo/database/web/types";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, countDistinct, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";
import { isPostgresError } from "../server/util.server";
import { $fetchArtists } from "./artists";
import {
  assertOwnsTokens,
  fireHaveAddNotifications,
  fireWantAddNotifications,
} from "./lists.server";

/**
 * Fetch a single objekt list along with the latest USD FX rate for its
 * currency, so the client can convert the global market price into the list's
 * own currency for display.
 */
export const $fetchObjektList = createServerFn({ method: "GET" })
  .inputValidator(
    z.union([
      z.object({ id: z.string() }),
      z.object({ userId: z.string(), slug: z.string() }),
    ]),
  )
  .handler(async ({ data }) => {
    const list = await db.query.objektLists.findFirst({ where: data });
    if (!list) return undefined;

    const fxRateToUsd = list.currency
      ? await fetchLatestFxRate(list.currency)
      : null;

    return { ...list, fxRateToUsd };
  });

/**
 * Fetch a single objekt list with the user, plus the latest USD FX rate for
 * the list's currency.
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

    const list = await db.query.objektLists.findFirst({
      where: { id: sanitized },
      with: {
        user: {
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
    if (!list) return undefined;

    const fxRateToUsd = list.currency
      ? await fetchLatestFxRate(list.currency)
      : null;

    const { user, ...listData } = list;
    const { cosmoAccount, ...userRow } = user;

    return {
      ...listData,
      fxRateToUsd,
      user: toPublicUser(userRow),
      userDisplay: userRow.displayUsername ?? userRow.name,
      cosmoUsername: cosmoAccount?.username,
    };
  });

function createSlug(name: string) {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
 * Create a new regular or sale objekt list. Have/want lists go through $createLiveList instead.
 */
export const $createObjektList = createServerFn({ method: "POST" })
  .inputValidator(createObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "regular" && data.type !== "sale") {
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
        currency: data.type === "sale" ? data.currency : null,
        description: data.description ?? null,
        type: data.type,
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
    if (data.type !== "have" && data.type !== "want") {
      throw new Error("Use $createObjektList for regular/sale lists.");
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
 * Update a regular or sale objekt list. Type cannot change after creation;
 * have/want lists go through $updateLiveList.
 */
export const $updateObjektList = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "regular" && data.type !== "sale") {
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
    if (existingRow.type !== data.type) {
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
        currency: data.type === "sale" ? data.currency : null,
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
    if (data.type !== "have" && data.type !== "want") {
      throw new Error("Use $updateObjektList for regular/sale lists.");
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
      collectionId: data.slug,
    });

    return true;
  });

/**
 * Add one or more owned serials to a sale list, each keyed by tokenId with its
 * own price. Verifies ownership against the indexer so users can only list
 * objekts they actually hold and that are currently transferable.
 */
export const $addObjektToSaleList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToSaleListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    await assertOwnsTokens(
      context.cosmo.address,
      data.collectionId,
      data.entries.map((e) => e.tokenId),
    );

    const verifiedAt = new Date().toISOString();

    await db.transaction(async (tx) => {
      const list = await tx.query.objektLists.findFirst({
        where: { id: data.objektListId, userId },
        columns: { type: true },
      });

      if (!list) {
        throw new Error("You do not have access to this list");
      }
      if (list.type !== "sale") {
        throw new Error("not_sale_list");
      }

      try {
        await tx.insert(objektListEntries).values(
          data.entries.map((entry) => ({
            objektListId: data.objektListId,
            collectionId: data.slug,
            tokenId: entry.tokenId,
            quantity: 1,
            price: entry.price,
            verifiedAt,
          })),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new Error("already_on_list");
        }
        throw error;
      }
    });

    return true;
  });

/**
 * Add one or more owned serials of a collection to a have list. Each serial
 * becomes its own entry row keyed by tokenId, so the drain can delete on
 * transfer with a single index lookup. If the list is trade-active and
 * discoverable, fires a single notification fan-out for the collection.
 */
export const $addObjektToHaveList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToHaveListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    // verify ownership against the indexer first
    await assertOwnsTokens(
      context.cosmo.address,
      data.collectionId,
      data.tokenIds,
    );

    const verifiedAt = new Date().toISOString();

    await db.transaction(async (tx) => {
      const list = await tx.query.objektLists.findFirst({
        where: { id: data.objektListId, userId },
        columns: { type: true, discoverable: true, linkedWantListId: true },
      });

      if (!list) {
        throw new Error("You do not have access to this list");
      }
      if (list.type !== "have") {
        throw new Error("not_have_list");
      }

      try {
        await tx.insert(objektListEntries).values(
          data.tokenIds.map((tokenId) => ({
            objektListId: data.objektListId,
            collectionId: data.slug,
            tokenId,
            quantity: 1,
            verifiedAt,
          })),
        );
      } catch (error) {
        if (isPostgresError(error, "23505")) {
          throw new Error("already_on_list");
        }

        throw error;
      }

      if (list.discoverable && list.linkedWantListId !== null) {
        await fireHaveAddNotifications(tx, {
          sourceUserId: userId,
          sourceListId: data.objektListId,
          slug: data.slug,
          collectionName: data.collectionName,
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
  .inputValidator(addObjektToWantListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    await db.transaction(async (tx) => {
      // assert ownership of the list and pull the linked list
      const parentList = await tx.query.objektLists.findFirst({
        where: { id: data.objektListId, userId },
        columns: { type: true, discoverable: true },
        with: {
          linkingHaveList: {
            where: { userId },
            columns: { id: true },
          },
        },
      });

      if (!parentList) {
        throw new Error("You do not have access to this list");
      }
      if (parentList.type !== "want") {
        throw new Error("not_want_list");
      }

      const isTradeActive = parentList.linkingHaveList !== null;

      const existing = await tx.query.objektListEntries.findFirst({
        where: {
          objektListId: data.objektListId,
          collectionId: data.slug,
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
          collectionId: data.slug,
          quantity: 1,
        });
      }

      if (parentList.discoverable && isTradeActive) {
        await fireWantAddNotifications(tx, {
          sourceUserId: userId,
          sourceListId: data.objektListId,
          slug: data.slug,
          collectionName: data.collectionName,
        });
      }
    });

    return true;
  });

/**
 * Update an existing list entry. Token-keyed entries (pinned to a single
 * serial) can only change price; collection-keyed entries update both price
 * and quantity. The client signals which variant via `kind`, and the server
 * cross-checks against the stored `tokenId` to reject mismatches.
 */
export const $updateObjektListEntry = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListEntrySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    const entry = await db.query.objektListEntries.findFirst({
      where: {
        id: data.objektListEntryId,
        objektListId: data.objektListId,
      },
      columns: { tokenId: true },
    });
    if (!entry) {
      throw new Error("entry_not_found");
    }

    const isTokenKeyed = entry.tokenId !== null;
    if (isTokenKeyed !== (data.kind === "token")) {
      throw new Error("entry_kind_mismatch");
    }

    await db
      .update(objektListEntries)
      .set({
        price: data.price,
        ...(data.kind === "collection" ? { quantity: data.quantity } : {}),
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

/**
 * Find trade partners for a single live list. Surfaces only mutual matches:
 * the partner must hold something in this anchor (or want it, depending on
 * anchor type) AND must want something the current user already holds (or
 * holds something the current user wants). Anchor must be trade-active.
 */
export const $findTradePartnersForList = createServerFn({ method: "GET" })
  .inputValidator(findTradePartnersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TradePartnersResponse> => {
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
      throw new Error("not_live_list");
    }

    const anchorIsActive =
      myList.type === "have"
        ? myList.linkedWantListId !== null
        : myList.linkingHaveList !== null;
    if (!anchorIsActive) {
      throw new Error("anchor_not_trade_active");
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

    let matches: PartnerMatchRow[] = [];

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
            theyHaveIWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirHaves.collectionId})`,
            iHaveTheyWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirWants.collectionId})`,
          })
          .from(theirHaves)
          .innerJoin(theirWants, eq(theirWants.userId, theirHaves.userId))
          .groupBy(theirHaves.userId)
          .orderBy(desc(countDistinct(theirHaves.collectionId)))
          .limit(50);

        matches = result.map((r) => ({
          userId: r.theirUserId,
          theyHaveIWant: r.theyHaveIWant ?? [],
          iHaveTheyWant: r.iHaveTheyWant ?? [],
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
            theyHaveIWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirHaves.collectionId})`,
            iHaveTheyWant: sql<
              string[] | null
            >`array_agg(DISTINCT ${theirWants.collectionId})`,
          })
          .from(theirWants)
          .innerJoin(theirHaves, eq(theirHaves.userId, theirWants.userId))
          .groupBy(theirWants.userId)
          .orderBy(desc(countDistinct(theirWants.collectionId)))
          .limit(50);

        matches = result.map((r) => ({
          userId: r.theirUserId,
          theyHaveIWant: r.theyHaveIWant ?? [],
          iHaveTheyWant: r.iHaveTheyWant ?? [],
        }));
        break;
      }
    }

    if (matches.length === 0) {
      return { partners: [], collections: {} };
    }

    const userIds = [...new Set(matches.map((r) => r.userId))];
    const slugs = [
      ...new Set(
        matches.flatMap((r) => [...r.theyHaveIWant, ...r.iHaveTheyWant]),
      ),
    ];

    const [cosmos, indexedCollections] = await Promise.all([
      db.query.cosmoAccounts.findMany({
        where: { userId: { in: userIds } },
        columns: { userId: true, username: true },
        with: { user: true },
      }),
      slugs.length > 0
        ? indexer.query.collections.findMany({
            where: { slug: { in: slugs } },
          })
        : Promise.resolve([]),
    ]);

    const identityByUserId = new Map<
      string,
      { username: string; user: PublicUser }
    >();
    for (const cosmo of cosmos) {
      if (!cosmo.userId || !cosmo.user) continue;
      identityByUserId.set(cosmo.userId, {
        username: cosmo.username,
        user: toPublicUser(cosmo.user),
      });
    }

    const collections: Record<string, Objekt.Collection> = {};
    for (const c of indexedCollections) {
      collections[c.slug] = Objekt.fromIndexer(c);
    }

    const partners: TradePartner[] = [];
    for (const row of matches) {
      const identity = identityByUserId.get(row.userId);
      if (!identity) continue;
      partners.push({
        userId: row.userId,
        username: identity.username,
        user: identity.user,
        theyHaveIWant: row.theyHaveIWant,
        iHaveTheyWant: row.iHaveTheyWant,
      });
    }

    return { partners, collections };
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
      throw new Error("discord_lists_required");
    }

    // fetch collections from the indexer
    const unique = new Set([
      ...have.entries.map((e) => e.collectionId),
      ...want.entries.map((e) => e.collectionId),
    ]);

    if (unique.size === 0) {
      throw new Error("discord_list_empty");
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
      have.type === "sale" ? have.currency : null,
    );
    const wantCollections = format(
      collections,
      want.entries,
      artistsArray,
      want.type === "sale" ? want.currency : null,
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
