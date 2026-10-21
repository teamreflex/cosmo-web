import { decodeCursor, encodeCursor } from "@/lib/server/cursor.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import {
  isListMatchNotification,
  isTradeNotification,
  type NotificationCollection,
  type NotificationPage,
  type NotificationRow,
  type NotificationToken,
  type TradeActor,
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
  user,
} from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const PAGE_SIZE = 30;

/**
 * An actor who isn't the recipient's counterparty is a staff member who
 * wrote in the trade's chat, named as the chat names them.
 */
function tradeActor(row: {
  actorId: string | null;
  actorUsername: string | null;
  actorName: string | null;
  counterpartyId: string | null;
}): TradeActor | null {
  if (row.actorId === null) {
    return null;
  }
  return row.actorId === row.counterpartyId
    ? { kind: "party", userId: row.actorId, username: row.actorUsername }
    : { kind: "staff", name: row.actorName };
}

/**
 * One page of the current user's notifications, newest first. The bell groups
 * the loaded rows into bursts. The cursor carries `created_at` as Postgres
 * text, which keeps the microseconds a JS Date would drop.
 *
 * A trade notification's counterparty is whichever party of its trade the
 * recipient isn't.
 */
export const $listNotifications = createServerFn({ method: "GET" })
  .validator(listNotificationsSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<NotificationPage> => {
    const after = decodeCursor(data.cursor);
    const actor = alias(cosmoAccounts, "actor");
    const actorUser = alias(user, "actor_user");
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
        actorName: sql<
          string | null
        >`coalesce(${actor.username}, ${actorUser.username})`,
        listId: objektLists.id,
        listSlug: objektLists.slug,
        collectionId: notifications.collectionId,
        tokenId: notifications.tokenId,
        offerId: tradeOffers.id,
        offerStatus: tradeOffers.status,
        counterpartyId,
        counterpartyUsername: counterparty.username,
      })
      .from(notifications)
      .leftJoin(objektLists, eq(objektLists.id, notifications.listId))
      .leftJoin(tradeOffers, eq(tradeOffers.id, notifications.offerId))
      .leftJoin(actor, eq(actor.userId, notifications.actorId))
      .leftJoin(actorUser, eq(actorUser.id, notifications.actorId))
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

    /**
     * The objekts of claimed trades, received offers and stale offers, in
     * posted order: the first two show what their `from` side sends, and a
     * stale offer says whose objekt moved.
     */
    const sendsShown = new Set(
      rows.flatMap((r) =>
        r.offerId !== null &&
        (r.type === "listing_claimed" || r.type === "offer_received")
          ? [r.offerId]
          : [],
      ),
    );
    const itemOfferIds = [
      ...sendsShown,
      ...rows.flatMap((r) =>
        r.offerId !== null && r.type === "offer_stale" ? [r.offerId] : [],
      ),
    ];
    const offerItems =
      itemOfferIds.length === 0
        ? []
        : await db
            .select({
              offerId: tradeOfferItems.offerId,
              sender: tradeOfferItems.sender,
              tokenId: tradeOfferItems.tokenId,
            })
            .from(tradeOfferItems)
            .where(
              and(
                inArray(tradeOfferItems.offerId, itemOfferIds),
                eq(tradeOfferItems.kind, "objekt"),
              ),
            )
            .orderBy(asc(tradeOfferItems.id));
    const itemsByOffer = Map.groupBy(offerItems, (i) => i.offerId);

    const slugs = [
      ...new Set(
        rows.flatMap((r) => (r.collectionId === null ? [] : [r.collectionId])),
      ),
    ];
    const tokenIds = [
      ...new Set([
        ...rows.flatMap((r) => (r.tokenId === null ? [] : [r.tokenId])),
        ...offerItems.flatMap((i) =>
          i.sender === "from" && i.tokenId !== null && sendsShown.has(i.offerId)
            ? [i.tokenId]
            : [],
        ),
      ]),
    ];
    const collectionColumns = {
      slug: collections.slug,
      name: collections.collectionId,
      frontImage: collections.frontImage,
      frontImageVersion: collections.frontImageVersion,
    };
    const pageCollections =
      slugs.length === 0
        ? []
        : await indexer
            .select(collectionColumns)
            .from(collections)
            .where(inArray(collections.slug, slugs));
    const pageTokens =
      tokenIds.length === 0
        ? []
        : await indexer
            .select({
              id: objekts.id,
              serial: objekts.serial,
              collection: collectionColumns,
            })
            .from(objekts)
            .innerJoin(collections, eq(objekts.collectionId, collections.id))
            .where(inArray(objekts.id, tokenIds.map(String)));
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
        if (
          !isTradeNotification(row.type) ||
          row.offerId === null ||
          row.offerStatus === null
        ) {
          return [];
        }
        const items = itemsByOffer.get(row.offerId) ?? [];
        return [
          {
            kind: "trade",
            id: row.id,
            createdAt: row.createdAt,
            type: row.type,
            unread: row.readAt === null,
            actor: tradeActor(row),
            counterparty:
              row.counterpartyId === null
                ? null
                : {
                    userId: row.counterpartyId,
                    username: row.counterpartyUsername,
                  },
            offer: { id: row.offerId, status: row.offerStatus },
            token: row.tokenId === null ? null : toToken(row.tokenId),
            tokenSender:
              row.type === "offer_stale"
                ? (items.find((i) => i.tokenId === row.tokenId)?.sender ?? null)
                : null,
            objekts:
              row.type === "listing_claimed" || row.type === "offer_received"
                ? items.flatMap((i) =>
                    i.sender === "from" && i.tokenId !== null
                      ? [toToken(i.tokenId)]
                      : [],
                  )
                : [],
            asked:
              row.type === "offer_received"
                ? items.filter((i) => i.sender === "to").length
                : 0,
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
