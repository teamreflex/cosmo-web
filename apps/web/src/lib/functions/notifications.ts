import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { markedNotifications } from "@/lib/server/notifications.server";
import { fetchSerials } from "@/lib/server/objekts/serials.server";
import {
  type NotificationCollection,
  type NotificationKind,
  notificationKinds,
  type NotificationListing,
  type NotificationListItem,
} from "@/lib/universal/notifications";
import {
  cosmoAccounts,
  type notificationType,
  notifications,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import * as z from "zod";

const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  kind: z.enum(notificationKinds).default("all"),
});

const markReadSchema = z.object({
  ids: z.array(z.uuid()).optional(),
});

const kindTypes = {
  all: null,
  trade: ["trade_have", "trade_want"],
  sale: ["sale_listed"],
} satisfies Record<
  NotificationKind,
  (typeof notificationType.enumValues)[number][] | null
>;

/**
 * The current user's notifications grouped into bursts, newest first.
 */
export const $listNotifications = createServerFn({ method: "GET" })
  .validator(listNotificationsSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<NotificationListItem[]> => {
    const marked = markedNotifications(
      context.session.session.userId,
      "recent",
    );
    const numbered = db.$with("numbered").as(
      db
        .select({
          id: marked.id,
          createdAt: marked.createdAt,
          type: marked.type,
          actorId: marked.actorId,
          listId: marked.listId,
          collectionId: marked.collectionId,
          entryId: marked.entryId,
          unread: marked.unread,
          burst:
            sql<number>`sum(${marked.startsBurst}) over (partition by ${marked.type}, ${marked.actorId}, ${marked.listId}, ${marked.unread} order by ${marked.createdAt})`.as(
              "burst",
            ),
        })
        .from(marked),
    );
    const types = kindTypes[data.kind];

    const bursts = await db
      .with(marked, numbered)
      .select({
        type: numbered.type,
        actorId: numbered.actorId,
        listId: numbered.listId,
        unread: numbered.unread,
        lastAt: max(numbered.createdAt),
        itemCount: count(),
        // text[], since Bun returns a uuid[] as an unparsed array literal
        ids: sql<string[]>`array_agg(${numbered.id}::text)`,
        // the newest few, for the row's names and thumbnails
        slugs: sql<
          string[]
        >`(array_agg(${numbered.collectionId} order by ${numbered.createdAt} desc))[1:5]`,
        // the newest serial a sale burst listed, if it's still listed
        entryId: sql<
          string | null
        >`(array_agg(${numbered.entryId}::text order by ${numbered.createdAt} desc))[1]`,
      })
      .from(numbered)
      .where(types === null ? undefined : inArray(numbered.type, types))
      .groupBy(
        numbered.type,
        numbered.actorId,
        numbered.listId,
        numbered.unread,
        numbered.burst,
      )
      .orderBy(desc(max(numbered.createdAt)))
      .limit(data.limit)
      .offset(data.offset);

    const actorIds = [
      ...new Set(
        bursts.flatMap((b) => (b.actorId === null ? [] : [b.actorId])),
      ),
    ];
    const listIds = [
      ...new Set(bursts.flatMap((b) => (b.listId === null ? [] : [b.listId]))),
    ];
    const slugs = [...new Set(bursts.flatMap((b) => b.slugs))];
    const entryIds = bursts.flatMap((b) =>
      b.type === "sale_listed" && b.entryId !== null ? [b.entryId] : [],
    );
    const [actors, lists, pageCollections, listings] = await Promise.all([
      actorIds.length === 0
        ? []
        : db
            .selectDistinctOn([cosmoAccounts.userId], {
              userId: cosmoAccounts.userId,
              username: cosmoAccounts.username,
            })
            .from(cosmoAccounts)
            .where(inArray(cosmoAccounts.userId, actorIds))
            .orderBy(cosmoAccounts.userId),
      listIds.length === 0
        ? []
        : db
            .select({ id: objektLists.id, slug: objektLists.slug })
            .from(objektLists)
            .where(inArray(objektLists.id, listIds)),
      slugs.length === 0
        ? []
        : indexer
            .select({
              slug: collections.slug,
              name: collections.collectionId,
              frontImage: collections.frontImage,
              frontImageVersion: collections.frontImageVersion,
            })
            .from(collections)
            .where(inArray(collections.slug, slugs)),
      fetchListings(entryIds),
    ]);
    const usernames = new Map(actors.map((a) => [a.userId, a.username]));
    const listSlugs = new Map(lists.map((l) => [l.id, l.slug]));
    const collectionsBySlug = new Map<string, NotificationCollection>(
      pageCollections.map((c) => [c.slug, c]),
    );

    // every type has an actor, a list and a collection (notifications_subject_chk)
    return bursts.flatMap((burst): NotificationListItem[] => {
      const listSlug =
        burst.listId === null ? undefined : listSlugs.get(burst.listId);
      if (
        burst.actorId === null ||
        burst.listId === null ||
        listSlug === undefined ||
        burst.lastAt === null
      ) {
        return [];
      }
      const base = {
        ids: burst.ids,
        lastAt: burst.lastAt,
        unread: burst.unread,
        itemCount: burst.itemCount,
        actor: {
          userId: burst.actorId,
          username: usernames.get(burst.actorId) ?? null,
        },
        list: { id: burst.listId, slug: listSlug },
        collections: burst.slugs.flatMap((slug) => {
          const collection = collectionsBySlug.get(slug);
          return collection === undefined ? [] : [collection];
        }),
      };
      return [
        burst.type === "sale_listed"
          ? {
              ...base,
              type: burst.type,
              listing:
                burst.entryId === null
                  ? null
                  : (listings.get(burst.entryId) ?? null),
            }
          : { ...base, type: burst.type },
      ];
    });
  });

/**
 * The current price and serial of listed entries, by entry id. Entries that
 * left their sale list are missing.
 */
async function fetchListings(entryIds: string[]) {
  if (entryIds.length === 0) return new Map<string, NotificationListing>();

  const entries = await db
    .select({
      id: objektListEntries.id,
      tokenId: objektListEntries.tokenId,
      price: objektListEntries.price,
      currency: objektLists.currency,
    })
    .from(objektListEntries)
    .innerJoin(objektLists, eq(objektLists.id, objektListEntries.objektListId))
    .where(inArray(objektListEntries.id, entryIds));
  const serials = await fetchSerials(
    entries.flatMap((e) => (e.tokenId === null ? [] : [e.tokenId])),
  );

  // sale lists always have a currency
  return new Map(
    entries.flatMap((entry) =>
      entry.currency === null
        ? []
        : [
            [
              entry.id,
              {
                serial:
                  entry.tokenId === null
                    ? null
                    : (serials.get(entry.tokenId) ?? null),
                price: entry.price,
                currency: entry.currency,
              },
            ] as const,
          ],
    ),
  );
}

/**
 * Mark notifications read. Pass an explicit list of IDs, or omit to mark all.
 */
export const $markNotificationsRead = createServerFn({ method: "POST" })
  .validator(markReadSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.session.userId;
    const now = new Date();

    if (data.ids && data.ids.length > 0) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, userId),
            inArray(notifications.id, data.ids),
          ),
        );
    } else {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        );
    }
    return true;
  });

/**
 * Count unread bursts for the current user — used by the header badge.
 */
export const $unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const marked = markedNotifications(
      context.session.session.userId,
      "unread",
    );
    const [row] = await db
      .with(marked)
      .select({
        count:
          sql<number>`count(*) filter (where ${marked.startsBurst} = 1)`.mapWith(
            Number,
          ),
      })
      .from(marked);
    return row?.count ?? 0;
  });
