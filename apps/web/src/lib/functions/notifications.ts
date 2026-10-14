import { decodeCursor, encodeCursor } from "@/lib/server/cursor.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import {
  isListMatchNotification,
  type NotificationCollection,
  type NotificationPage,
  type NotificationRow,
  type NotificationToken,
} from "@/lib/universal/notifications";
import {
  listNotificationsSchema,
  markNotificationsReadSchema,
} from "@/lib/universal/schema/notifications";
import {
  cosmoAccounts,
  notifications,
  objektLists,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const PAGE_SIZE = 30;

/**
 * One page of the current user's notifications, newest first. The bell groups
 * the loaded rows into bursts. The cursor carries `created_at` as Postgres
 * text, which keeps the microseconds a JS Date would drop.
 *
 * A trade notification's counterparty is whichever party of its trade the
 * recipient isn't, and its listing is the one the trade's items came from,
 * or the listing itself.
 */
export const $listNotifications = createServerFn({ method: "GET" })
  .validator(listNotificationsSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<NotificationPage> => {
    const after = decodeCursor(data.cursor);
    const actor = alias(cosmoAccounts, "actor");
    const counterparty = alias(cosmoAccounts, "counterparty");
    const counterpartyId = sql<
      string | null
    >`CASE WHEN ${tradeOffers.fromUserId} = ${notifications.userId} THEN ${tradeOffers.toUserId} ELSE ${tradeOffers.fromUserId} END`;
    const rows = await db
      .select({
        id: notifications.id,
        createdAt: notifications.createdAt,
        cursorAt: sql<string>`${notifications.createdAt}::text`,
        type: notifications.type,
        readAt: notifications.readAt,
        actorId: notifications.actorId,
        actorUsername: actor.username,
        listId: objektLists.id,
        listSlug: objektLists.slug,
        collectionId: notifications.collectionId,
        tokenId: notifications.tokenId,
        offerId: tradeOffers.id,
        offerStatus: tradeOffers.status,
        listingId: sql<
          string | null
        >`CASE WHEN ${tradeOffers.kind} = 'listing' THEN ${tradeOffers.id} ELSE (SELECT ${tradeOfferItems.listingId} FROM ${tradeOfferItems} WHERE ${tradeOfferItems.offerId} = ${tradeOffers.id} AND ${tradeOfferItems.listingId} IS NOT NULL LIMIT 1) END`,
        counterpartyId,
        counterpartyUsername: counterparty.username,
      })
      .from(notifications)
      .leftJoin(objektLists, eq(objektLists.id, notifications.listId))
      .leftJoin(tradeOffers, eq(tradeOffers.id, notifications.offerId))
      .leftJoin(actor, eq(actor.userId, notifications.actorId))
      .leftJoin(counterparty, eq(counterparty.userId, counterpartyId))
      .where(
        and(
          eq(notifications.userId, context.session.session.userId),
          after
            ? sql`(${notifications.createdAt}, ${notifications.id}) < (${after.timestamp}::timestamptz, ${after.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(PAGE_SIZE);

    // what each claimed listing's poster sends, in posted order
    const claimedIds = rows.flatMap((r) =>
      r.type === "listing_claimed" && r.offerId !== null ? [r.offerId] : [],
    );
    const posterItems =
      claimedIds.length === 0
        ? []
        : await db
            .select({
              offerId: tradeOfferItems.offerId,
              tokenId: tradeOfferItems.tokenId,
            })
            .from(tradeOfferItems)
            .where(
              and(
                inArray(tradeOfferItems.offerId, claimedIds),
                eq(tradeOfferItems.sender, "from"),
                eq(tradeOfferItems.kind, "objekt"),
              ),
            )
            .orderBy(asc(tradeOfferItems.id));
    const posterTokens = Map.groupBy(posterItems, (i) => i.offerId);

    const slugs = [
      ...new Set(
        rows.flatMap((r) => (r.collectionId === null ? [] : [r.collectionId])),
      ),
    ];
    const tokenIds = [
      ...new Set([
        ...rows.flatMap((r) => (r.tokenId === null ? [] : [r.tokenId])),
        ...posterItems.flatMap((i) => (i.tokenId === null ? [] : [i.tokenId])),
      ]),
    ];
    const collectionColumns = {
      slug: collections.slug,
      name: collections.collectionId,
      frontImage: collections.frontImage,
      frontImageVersion: collections.frontImageVersion,
    };
    const [pageCollections, pageTokens] = await Promise.all([
      slugs.length === 0
        ? []
        : indexer
            .select(collectionColumns)
            .from(collections)
            .where(inArray(collections.slug, slugs)),
      tokenIds.length === 0
        ? []
        : indexer
            .select({
              id: objekts.id,
              serial: objekts.serial,
              collection: collectionColumns,
            })
            .from(objekts)
            .innerJoin(collections, eq(objekts.collectionId, collections.id))
            .where(inArray(objekts.id, tokenIds.map(String))),
    ]);
    const collectionsBySlug = new Map<string, NotificationCollection>(
      pageCollections.map((c) => [c.slug, c]),
    );
    const tokensById = new Map(pageTokens.map((t) => [Number(t.id), t]));
    const toToken = (tokenId: number): NotificationToken => {
      const token = tokensById.get(tokenId);
      return {
        tokenId,
        serial: token?.serial ?? null,
        collection: token?.collection ?? null,
      };
    };

    const last = rows.at(-1);
    return {
      // the joins are present for every row of the type (notifications_subject_chk)
      rows: rows.flatMap((row): NotificationRow[] => {
        if (isListMatchNotification(row.type)) {
          return row.actorId === null ||
            row.listId === null ||
            row.listSlug === null
            ? []
            : [
                {
                  kind: "list_match",
                  id: row.id,
                  createdAt: row.createdAt,
                  type: row.type,
                  unread: row.readAt === null,
                  actor: { userId: row.actorId, username: row.actorUsername },
                  list: { id: row.listId, slug: row.listSlug },
                  collection:
                    row.collectionId === null
                      ? null
                      : (collectionsBySlug.get(row.collectionId) ?? null),
                },
              ];
        }
        return row.offerId === null || row.offerStatus === null
          ? []
          : [
              {
                kind: "trade",
                id: row.id,
                createdAt: row.createdAt,
                type: row.type,
                unread: row.readAt === null,
                actor:
                  row.actorId === null
                    ? null
                    : { userId: row.actorId, username: row.actorUsername },
                counterparty:
                  row.counterpartyId === null
                    ? null
                    : {
                        userId: row.counterpartyId,
                        username: row.counterpartyUsername,
                      },
                offer: {
                  id: row.offerId,
                  status: row.offerStatus,
                  listingId: row.listingId,
                },
                token: row.tokenId === null ? null : toToken(row.tokenId),
                objekts:
                  row.type === "listing_claimed"
                    ? (posterTokens.get(row.offerId) ?? []).flatMap((i) =>
                        i.tokenId === null ? [] : [toToken(i.tokenId)],
                      )
                    : [],
              },
            ];
      }),
      nextCursor:
        rows.length === PAGE_SIZE && last
          ? encodeCursor(last.cursorAt, last.id)
          : undefined,
    };
  });

/**
 * Mark the given notifications read, or all of them.
 */
export const $markNotificationsRead = createServerFn({ method: "POST" })
  .validator(markNotificationsReadSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, context.session.session.userId),
          "ids" in data
            ? inArray(notifications.id, data.ids)
            : isNull(notifications.readAt),
        ),
      );
    return true;
  });

/**
 * Count unread notifications for the current user — used by the header badge.
 */
export const $unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    db.$count(
      notifications,
      and(
        eq(notifications.userId, context.session.session.userId),
        isNull(notifications.readAt),
      ),
    ),
  );
