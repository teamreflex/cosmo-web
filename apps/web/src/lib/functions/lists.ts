import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, members } from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { assertSupportedCurrency } from "@/lib/server/objekts/fx.server";
import {
  assertOwnsTokensMulti,
  assertUserOwnsList,
  fireHaveAddNotifications,
  fireSaleNotifications,
  fireWantAddNotifications,
} from "@/lib/server/objekts/lists.server";
import {
  fetchMarketStats,
  fetchMedianPrices,
  isAboveMedian,
  isFloorPrice,
} from "@/lib/server/objekts/market.server";
import type { PublicUser } from "@/lib/universal/auth";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type {
  ListShelfItem,
  PartnerListMatch,
  PartnerMatchRow,
  TradePartner,
  TradePartnersResponse,
} from "@/lib/universal/lists";
import { Objekt } from "@/lib/universal/objekt-conversion";
import {
  addObjektsToHaveListSchema,
  addObjektsToListSchema,
  addObjektsToSaleListSchema,
  addObjektsToWantListSchema,
  createObjektListSchema,
  deleteObjektListSchema,
  findTradePartnersSchema,
  generateDiscordListSchema,
  generateSaleListTextSchema,
  removeObjektFromListSchema,
  updateObjektListEntrySchema,
  updateObjektListSchema,
} from "@/lib/universal/schema/objekt-list";
import { baseUrl, createSlug, sanitizeUuid } from "@/lib/utils";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import type { ObjektListEntry } from "@apollo/database/web/types";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, ne, type SQLWrapper, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";

/**
 * Fetch a single objekt list by id or by owner + slug, along with the latest
 * USD FX rate for a sale list's currency. Have and want lists also carry the
 * list they're paired with for trading.
 */
export const $fetchObjektList = createServerFn({ method: "GET" })
  .validator(
    z.union([
      z.object({ id: z.string() }),
      z.object({ userId: z.string(), slug: z.string() }),
    ]),
  )
  .handler(async ({ data }) => {
    const result = await db.query.objektLists.findFirst({
      where: data,
      with: {
        // latest rate for a sale list's currency
        fxRates: {
          columns: { rateToUsd: true },
          orderBy: { date: "desc" },
          limit: 1,
        },
        linkedWantList: { columns: { slug: true, type: true } },
        linkingHaveList: { columns: { slug: true, type: true } },
      },
    });
    if (!result) return undefined;

    // a have list points at its want list, a want list is pointed at by a have list
    const { fxRates, linkedWantList, linkingHaveList, ...list } = result;

    return {
      ...list,
      fxRateToUsd: fxRates[0]?.rateToUsd ?? null,
      pairedList: linkedWantList ?? linkingHaveList,
    };
  });

/**
 * Pricing overview of the owner's sale list: how many serials are priced, the
 * asking total, how many sit at the market floor or above the median, and the
 * newest unpriced entry for the header's "price the unpriced" action.
 */
export const $fetchSaleListSummary = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.uuid() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const list = await db.query.objektLists.findFirst({
      where: {
        id: data.id,
        userId: context.session.session.userId,
        type: "sale",
      },
      columns: { id: true },
      with: {
        entries: {
          columns: {
            id: true,
            collectionId: true,
            tokenId: true,
            quantity: true,
            price: true,
          },
          orderBy: { createdAt: "desc" },
        },
        fxRates: {
          columns: { rateToUsd: true },
          orderBy: { date: "desc" },
          limit: 1,
        },
      },
    });
    if (!list) {
      throw new ExpectedError("list_not_found");
    }

    const rateToUsd = list.fxRates[0]?.rateToUsd ?? null;
    const priced = list.entries.flatMap((entry) =>
      entry.price === null ? [] : [{ ...entry, price: entry.price }],
    );
    const firstUnpriced = list.entries.find((entry) => entry.price === null);
    const pricedSlugs = [...new Set(priced.map((e) => e.collectionId))];
    const [marketStats, medians, firstUnpricedCollection] = await Promise.all([
      fetchMarketStats(pricedSlugs),
      fetchMedianPrices(pricedSlugs),
      firstUnpriced &&
        indexer.query.collections.findFirst({
          where: { slug: firstUnpriced.collectionId },
          columns: { collectionId: true },
        }),
    ]);

    const askingTotal = priced.reduce(
      (sum, entry) => sum + entry.price * entry.quantity,
      0,
    );
    const pricedUsd =
      rateToUsd === null
        ? []
        : priced.map((entry) => ({
            ...entry,
            priceUsd: entry.price * rateToUsd,
          }));

    return {
      total: list.entries.length,
      priced: priced.length,
      askingTotal,
      askingTotalUsd: rateToUsd === null ? null : askingTotal * rateToUsd,
      // the edit dialog's price check converts other listings with it
      rateToUsd,
      atFloor: pricedUsd.filter(
        (entry) =>
          entry.tokenId !== null &&
          isFloorPrice(entry.priceUsd, marketStats.get(entry.collectionId)),
      ).length,
      aboveMedian: pricedUsd.filter((entry) =>
        isAboveMedian(entry.priceUsd, medians.get(entry.collectionId)),
      ).length,
      // named for the edit dialog's title
      firstUnpriced:
        firstUnpriced === undefined
          ? null
          : {
              ...firstUnpriced,
              name:
                firstUnpricedCollection?.collectionId ??
                firstUnpriced.collectionId,
            },
    };
  });

/**
 * Fetch a user's lists for the profile shelf, each with images of its three
 * most recently added entries.
 */
export const $fetchListShelf = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }): Promise<ListShelfItem[]> => {
    const lists = await db.query.objektLists.findMany({
      where: { userId: data.userId },
      orderBy: { createdAt: "asc" },
      with: {
        entries: {
          columns: { collectionId: true },
          orderBy: { createdAt: "desc" },
          limit: 3,
        },
      },
    });

    const slugs = [
      ...new Set(lists.flatMap((l) => l.entries.map((e) => e.collectionId))),
    ];

    if (slugs.length === 0) {
      return lists.map(({ entries: _, ...list }) => ({
        ...list,
        previews: [],
      }));
    }

    const collections = await indexer.query.collections.findMany({
      where: { slug: { in: slugs } },
      columns: {
        slug: true,
        collectionId: true,
        frontImage: true,
        frontImageVersion: true,
      },
    });

    const bySlug = new Map(collections.map((c) => [c.slug, c]));
    return lists.map(({ entries, ...list }) => ({
      ...list,
      previews: entries.flatMap((entry) => {
        const collection = bySlug.get(entry.collectionId);
        return collection ? [collection] : [];
      }),
    }));
  });

/**
 * Fetch a single objekt list with its owner.
 */
export const $getObjektListWithUser = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
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
        // latest rate for a sale list's currency
        fxRates: {
          columns: { rateToUsd: true },
          orderBy: { date: "desc" },
          limit: 1,
        },
      },
    });
    if (!list) return undefined;

    const { user, fxRates, ...listData } = list;
    const { cosmoAccount, ...userRow } = user;

    return {
      ...listData,
      fxRateToUsd: fxRates[0]?.rateToUsd ?? null,
      user: toPublicUser(userRow),
      userDisplay: userRow.displayUsername ?? userRow.name,
      cosmoUsername: cosmoAccount?.username,
    };
  });

/**
 * Create a new regular or sale objekt list. Have/want lists go through $createLiveList instead.
 */
export const $createObjektList = createServerFn({ method: "POST" })
  .validator(createObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "regular" && data.type !== "sale") {
      throw new Error("Use $createLiveList for have/want lists.");
    }
    if (data.type === "sale") {
      await assertSupportedCurrency(data.currency);
    }

    const slug = createSlug(data.name);

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
      .onConflictDoNothing({
        target: [objektLists.userId, objektLists.slug],
      })
      .returning();

    // a missing row means the (user, slug) unique index suppressed the insert
    if (!result) {
      throw new ExpectedError("list_name_taken");
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
  .validator(createObjektListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    if (data.type !== "have" && data.type !== "want") {
      throw new Error("Use $createObjektList for regular/sale lists.");
    }

    const userId = context.session.user.id;
    const slug = createSlug(data.name);

    if (data.pairListId !== null) {
      const targetType = data.type === "have" ? "want" : "have";
      const target = await db.query.objektLists.findFirst({
        where: { id: data.pairListId, userId, type: targetType },
        columns: { id: true, linkedWantListId: true },
      });
      if (!target) {
        throw new ExpectedError(`not_${targetType}_list`);
      }

      if (data.type === "have") {
        const alreadyLinked = await db.query.objektLists.findFirst({
          where: { userId, type: "have", linkedWantListId: data.pairListId },
          columns: { id: true },
        });
        if (alreadyLinked) {
          throw new ExpectedError("want_list_already_linked");
        }
      } else if (target.linkedWantListId !== null) {
        throw new ExpectedError("have_list_already_linked");
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
        .onConflictDoNothing({
          target: [objektLists.userId, objektLists.slug],
        })
        .returning();

      // a missing row means the (user, slug) unique index suppressed the insert
      if (!row) {
        throw new ExpectedError("list_name_taken");
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
  .validator(updateObjektListSchema)
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
      throw new ExpectedError("list_not_found");
    }
    if (existingRow.type !== data.type) {
      throw new ExpectedError("list_type_locked");
    }
    if (data.type === "sale") {
      await assertSupportedCurrency(data.currency);
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
      throw new ExpectedError("list_name_taken");
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
  .validator(updateObjektListSchema)
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
      throw new ExpectedError("list_not_found");
    }
    if (existingRow.type !== data.type) {
      throw new ExpectedError("list_type_locked");
    }

    const slug = createSlug(data.name);

    const conflict = await db.query.objektLists.findFirst({
      where: { slug, userId, id: { ne: data.id } },
    });
    if (conflict !== undefined) {
      throw new ExpectedError("list_name_taken");
    }

    if (data.pairListId !== null) {
      const targetType = data.type === "have" ? "want" : "have";
      const target = await db.query.objektLists.findFirst({
        where: { id: data.pairListId, userId, type: targetType },
        columns: { id: true, linkedWantListId: true },
      });
      if (!target) {
        throw new ExpectedError(`not_${targetType}_list`);
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
          throw new ExpectedError("want_list_already_linked");
        }
      } else if (
        target.linkedWantListId !== null &&
        target.linkedWantListId !== data.id
      ) {
        throw new ExpectedError("have_list_already_linked");
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
  .validator(deleteObjektListSchema)
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
 * Add one or more collections to a regular list as collection-keyed entries.
 * Collections are not deduped, so the inserted count always matches the number
 * of distinct slugs supplied.
 */
export const $addObjektsToList = createServerFn({ method: "POST" })
  .validator(addObjektsToListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const list = await db.query.objektLists.findFirst({
      where: { id: data.objektListId, userId: context.session.session.userId },
      columns: { type: true },
    });

    if (!list) {
      throw new ExpectedError("list_no_access");
    }
    if (list.type !== "regular") {
      throw new ExpectedError("not_regular_list");
    }

    const slugs = [...new Set(data.slugs)];

    const inserted = await db
      .insert(objektListEntries)
      .values(
        slugs.map((slug) => ({
          objektListId: data.objektListId,
          collectionId: slug,
        })),
      )
      .returning();

    return { inserted: inserted.length };
  });

/**
 * Add one or more owned serials to a sale list, each keyed by tokenId with its
 * own price. Verifies ownership against the indexer so users can only list
 * objekts they actually hold and that are currently transferable. Serials
 * already on the list are silently skipped via the partial unique index.
 * Priced serials notify everyone watching their collection.
 */
export const $addObjektsToSaleList = createServerFn({ method: "POST" })
  .validator(addObjektsToSaleListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    await assertOwnsTokensMulti(
      context.cosmo.address,
      data.entries.map((e) => ({
        tokenId: e.tokenId,
        collectionId: e.collectionId,
      })),
    );

    const verifiedAt = new Date().toISOString();

    const inserted = await db.transaction(async (tx) => {
      const list = await tx.query.objektLists.findFirst({
        where: { id: data.objektListId, userId },
        columns: { type: true },
      });

      if (!list) {
        throw new ExpectedError("list_no_access");
      }
      if (list.type !== "sale") {
        throw new ExpectedError("not_sale_list");
      }

      return await tx
        .insert(objektListEntries)
        .values(
          data.entries.map((entry) => ({
            objektListId: data.objektListId,
            collectionId: entry.slug,
            tokenId: entry.tokenId,
            quantity: 1,
            price: entry.price,
            verifiedAt,
          })),
        )
        .onConflictDoNothing()
        .returning();
    });

    await fireSaleNotifications({
      sellerId: userId,
      listId: data.objektListId,
      entries: inserted.filter((entry) => entry.price !== null),
    });

    return { inserted: inserted.length };
  });

/**
 * Add one or more owned serials to a have list. Each serial becomes its own
 * entry row keyed by tokenId, so the drain can delete on transfer with a single
 * index lookup. Serials already on the list are silently skipped via the
 * partial unique index. If the list is trade-active and discoverable, fires a
 * notification fan-out per distinct collection that gained at least one serial.
 */
export const $addObjektsToHaveList = createServerFn({ method: "POST" })
  .validator(addObjektsToHaveListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    // verify ownership against the indexer first
    await assertOwnsTokensMulti(
      context.cosmo.address,
      data.objekts.map((o) => ({
        tokenId: o.tokenId,
        collectionId: o.collectionId,
      })),
    );

    const verifiedAt = new Date().toISOString();

    const { inserted, slugs } = await db.transaction(async (tx) => {
      const list = await tx.query.objektLists.findFirst({
        where: { id: data.objektListId, userId },
        columns: { type: true, discoverable: true, linkedWantListId: true },
      });

      if (!list) {
        throw new ExpectedError("list_no_access");
      }
      if (list.type !== "have") {
        throw new ExpectedError("not_have_list");
      }

      const inserted = await tx
        .insert(objektListEntries)
        .values(
          data.objekts.map((o) => ({
            objektListId: data.objektListId,
            collectionId: o.slug,
            tokenId: o.tokenId,
            quantity: 1,
            verifiedAt,
          })),
        )
        .onConflictDoNothing()
        .returning();

      // a trade-active list notifies once per distinct collection that actually gained a serial
      const slugs = new Set<string>();
      if (list.discoverable && list.linkedWantListId !== null) {
        for (const entry of inserted) {
          slugs.add(entry.collectionId);
        }
      }

      return { inserted: inserted.length, slugs };
    });

    await fireHaveAddNotifications({
      sourceUserId: userId,
      sourceListId: data.objektListId,
      slugs: [...slugs],
    });

    return { inserted };
  });

/**
 * Add one or more objekts to a want list. Skips ownership verification (you can
 * want anything). Existing collections stack by the requested quantity (default
 * one); new ones insert at it. Fires mutual-viability notifications when the
 * list is trade-active and discoverable.
 */
export const $addObjektsToWantList = createServerFn({ method: "POST" })
  .validator(addObjektsToWantListSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    // selections are keyed by slug client-side, but guard against duplicates
    const objekts = [...new Map(data.objekts.map((o) => [o.slug, o])).values()];

    const notify = await db.transaction(async (tx) => {
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
        throw new ExpectedError("list_no_access");
      }
      if (parentList.type !== "want") {
        throw new ExpectedError("not_want_list");
      }

      const isTradeActive = parentList.linkingHaveList !== null;

      const existing = await tx.query.objektListEntries.findMany({
        where: {
          objektListId: data.objektListId,
          collectionId: { in: objekts.map((o) => o.slug) },
        },
        columns: { id: true, collectionId: true },
      });
      const existingSlugs = new Set(existing.map((e) => e.collectionId));

      // stack existing entries in bulk, grouped by the quantity being added
      const quantities = new Map(objekts.map((o) => [o.slug, o.quantity]));
      const byQuantity = new Map<number, string[]>();
      for (const entry of existing) {
        const quantity = quantities.get(entry.collectionId) ?? 1;
        const ids = byQuantity.get(quantity) ?? [];
        ids.push(entry.id);
        byQuantity.set(quantity, ids);
      }
      for (const [quantity, ids] of byQuantity) {
        await tx
          .update(objektListEntries)
          .set({ quantity: sql`${objektListEntries.quantity} + ${quantity}` })
          .where(inArray(objektListEntries.id, ids));
      }

      const fresh = objekts.filter((o) => !existingSlugs.has(o.slug));
      if (fresh.length > 0) {
        await tx.insert(objektListEntries).values(
          fresh.map((o) => ({
            objektListId: data.objektListId,
            collectionId: o.slug,
            quantity: o.quantity,
          })),
        );
      }

      return parentList.discoverable && isTradeActive;
    });

    if (notify) {
      await fireWantAddNotifications({
        sourceUserId: userId,
        sourceListId: data.objektListId,
        slugs: objekts.map((o) => o.slug),
      });
    }

    // want lists stack quantity, so every add counts toward the inserted total
    return { inserted: objekts.length };
  });

/**
 * Update an existing list entry. Token-keyed entries (pinned to a single
 * serial) can only change price; collection-keyed entries update both price
 * and quantity. The client signals which variant via `kind`, and the server
 * cross-checks against the stored `tokenId` to reject mismatches.
 */
export const $updateObjektListEntry = createServerFn({ method: "POST" })
  .validator(updateObjektListEntrySchema)
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
      throw new ExpectedError("entry_not_found");
    }

    const isTokenKeyed = entry.tokenId !== null;
    if (isTokenKeyed !== (data.kind === "token")) {
      throw new ExpectedError("entry_kind_mismatch");
    }

    await db
      .update(objektListEntries)
      .set(
        data.kind === "collection"
          ? { price: data.price, quantity: data.quantity }
          : { price: data.price },
      )
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
  .validator(removeObjektFromListSchema)
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
  .validator(findTradePartnersSchema)
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
      throw new ExpectedError("not_live_list");
    }

    // my side of the trade pair: the anchor and the list it's paired with,
    // so partner matches are pair against pair
    const [myWantListId, myHaveListId] =
      myList.type === "want"
        ? [myList.id, myList.linkingHaveList?.id ?? null]
        : [myList.linkedWantListId, myList.id];
    if (myWantListId === null || myHaveListId === null) {
      throw new ExpectedError("anchor_not_trade_active");
    }

    // every other user's trade pair: a discoverable have list and the
    // discoverable want list it's paired with
    const h = alias(objektLists, "h");
    const w = alias(objektLists, "w");
    const theyHaveIWant = sharedCollections(h.id, myWantListId);
    const iHaveTheyWant = sharedCollections(w.id, myHaveListId);
    // the anchor's side ranks the pairs and names the partner list shown
    const ranking = {
      want: { list: h, first: theyHaveIWant, second: iHaveTheyWant },
      have: { list: w, first: iHaveTheyWant, second: theyHaveIWant },
    }[myList.type];

    const matches: PartnerMatchRow[] = await db
      .select({
        userId: h.userId,
        listId: ranking.list.id,
        listSlug: ranking.list.slug,
        listName: ranking.list.name,
        theyHaveIWant,
        iHaveTheyWant,
      })
      .from(h)
      .innerJoin(w, eq(w.id, h.linkedWantListId))
      .where(
        and(
          eq(h.type, "have"),
          eq(h.discoverable, true),
          eq(w.type, "want"),
          eq(w.discoverable, true),
          eq(w.userId, h.userId),
          ne(h.userId, userId),
          sql`cardinality(${theyHaveIWant}) > 0`,
          sql`cardinality(${iHaveTheyWant}) > 0`,
        ),
      )
      .orderBy(
        sql`cardinality(${ranking.first}) desc`,
        sql`cardinality(${ranking.second}) desc`,
        h.userId,
      );

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

    const partnerOrder: string[] = [];
    const matchesByUserId = new Map<string, PartnerListMatch[]>();
    for (const row of matches) {
      const list = matchesByUserId.get(row.userId);
      if (list) {
        list.push({
          listId: row.listId,
          listSlug: row.listSlug,
          listName: row.listName,
          theyHaveIWant: row.theyHaveIWant,
          iHaveTheyWant: row.iHaveTheyWant,
        });
      } else {
        partnerOrder.push(row.userId);
        matchesByUserId.set(row.userId, [
          {
            listId: row.listId,
            listSlug: row.listSlug,
            listName: row.listName,
            theyHaveIWant: row.theyHaveIWant,
            iHaveTheyWant: row.iHaveTheyWant,
          },
        ]);
      }
    }

    const partners: TradePartner[] = [];
    for (const partnerUserId of partnerOrder) {
      const identity = identityByUserId.get(partnerUserId);
      if (!identity) continue;
      const partnerMatches = matchesByUserId.get(partnerUserId) ?? [];
      partners.push({
        userId: partnerUserId,
        username: identity.username,
        user: identity.user,
        matches: partnerMatches,
      });
    }

    // Rank partners by total distinct collections they hold that I want, so a
    // partner with multiple matching trade pairs outranks a one-pair partner
    // with the same per-pair overlap.
    partners.sort((a, b) => {
      const aTotal = new Set(a.matches.flatMap((m) => m.theyHaveIWant)).size;
      const bTotal = new Set(b.matches.flatMap((m) => m.theyHaveIWant)).size;
      return bTotal - aTotal;
    });

    return { partners, collections };
  });

/**
 * Collections on a partner's list that are also on one of mine, matched as an
 * intersection per partner list. Every read is by list id, so the plan never
 * looks a collection up across every list. Mine is read once into an array
 * rather than once per partner list.
 */
function sharedCollections(partnerListId: SQLWrapper, myListId: string) {
  return sql<string[]>`array(
    select ${objektListEntries.collectionId} from ${objektListEntries}
    where ${objektListEntries.objektListId} = ${partnerListId}
    intersect
    select unnest(array(
      select ${objektListEntries.collectionId} from ${objektListEntries}
      where ${objektListEntries.objektListId} = ${myListId}
    ))
  )`;
}

/**
 * Generate a Discord have/want list.
 */
export const $generateDiscordList = createServerFn({ method: "POST" })
  .validator(generateDiscordListSchema)
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
      throw new ExpectedError("discord_lists_required");
    }

    // fetch collections from the indexer
    const unique = new Set([
      ...have.entries.map((e) => e.collectionId),
      ...want.entries.map((e) => e.collectionId),
    ]);

    if (unique.size === 0) {
      throw new ExpectedError("discord_list_empty");
    }

    // join the canonical member sort order onto each collection for grouping
    const listCollections = await indexer
      .select({
        slug: collections.slug,
        season: collections.season,
        collectionNo: collections.collectionNo,
        member: collections.member,
        artist: collections.artist,
        memberSortOrder: members.sortOrder,
      })
      .from(collections)
      .leftJoin(members, eq(members.name, collections.member))
      .where(inArray(collections.slug, Array.from(unique)));

    // map into discord format
    const haveCollections = format(
      listCollections,
      have.entries,
      have.type === "sale" ? have.currency : null,
    );
    const wantCollections = format(
      listCollections,
      want.entries,
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

/**
 * Render a sale list as text, one member per line. Serials on the same
 * collection at the same price collapse into one `xN` entry. Unpriced serials
 * go on a separate offers line under their member, or are left out.
 */
export const $generateSaleListText = createServerFn({ method: "POST" })
  .validator(generateSaleListTextSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const list = await db.query.objektLists.findFirst({
      where: {
        id: data.id,
        userId: context.session.session.userId,
        type: "sale",
      },
      with: {
        entries: true,
        user: { with: { cosmoAccount: { columns: { username: true } } } },
      },
    });
    if (!list) {
      throw new ExpectedError("list_not_found");
    }
    if (list.entries.length === 0) {
      throw new ExpectedError("sale_list_empty");
    }

    const grouped = new Map<string, ObjektListEntry>();
    for (const entry of list.entries) {
      if (entry.price === null && !data.unpricedAsOffers) continue;
      const key = `${entry.collectionId}:${entry.price}`;
      const existing = grouped.get(key);
      grouped.set(
        key,
        existing
          ? { ...existing, quantity: existing.quantity + entry.quantity }
          : entry,
      );
    }
    const entries = [...grouped.values()];
    if (entries.length === 0) {
      return "";
    }

    const listCollections = await indexer
      .select({
        slug: collections.slug,
        season: collections.season,
        collectionNo: collections.collectionNo,
        member: collections.member,
        artist: collections.artist,
        memberSortOrder: members.sortOrder,
      })
      .from(collections)
      .leftJoin(members, eq(members.name, collections.member))
      .where(
        inArray(
          collections.slug,
          entries.map((e) => e.collectionId),
        ),
      );

    const lines = groupByMember(listCollections, entries).flatMap(
      ([member, memberCollections]) => {
        const priced = memberCollections.filter((c) => c.price != null);
        const offers = memberCollections.filter((c) => c.price == null);
        return [
          ...(priced.length > 0
            ? [`${member} ${formatMemberCollections(priced, list.currency)}`]
            : []),
          ...(offers.length > 0
            ? [
                `${member} offers: ${formatMemberCollections(offers, list.currency)}`,
              ]
            : []),
        ];
      },
    );

    if (data.includeLink) {
      const username = list.user.cosmoAccount?.username;
      lines.push(
        "",
        username === undefined
          ? `${baseUrl()}/list/${list.id}`
          : `${baseUrl()}/@${username}/list/${list.slug}`,
      );
    }

    return lines.join("\n");
  });

type CollectionSubset = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo" | "artist"
> & {
  memberSortOrder: number | null;
};

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
  collectionList: CollectionSubset[],
  entries: ObjektListEntry[],
  currency: string | null,
): string[] {
  return groupByMember(collectionList, entries).map(
    ([member, memberCollections]) =>
      `${member} ${formatMemberCollections(memberCollections, currency)}`,
  );
}

/**
 * Pair each entry with its collection, grouped by member and sorted by the
 * canonical member order.
 */
function groupByMember(
  collectionList: CollectionSubset[],
  entries: ObjektListEntry[],
) {
  // create a map for quick collection lookup by slug
  const collectionsMap = new Map(collectionList.map((c) => [c.slug, c]));

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

  // sort members by their canonical indexer sort order (carried on each row)
  return Array.from(groupedCollectionsByMember.entries()).sort(
    ([, a], [, b]) => {
      const orderA = a[0]?.memberSortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b[0]?.memberSortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    },
  );
}
