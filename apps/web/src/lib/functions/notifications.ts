import { decodeCursor, encodeCursor } from "@/lib/server/cursor.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import type {
  NotificationCollection,
  NotificationPage,
  NotificationRow,
} from "@/lib/universal/notifications";
import {
  listNotificationsSchema,
  markNotificationsReadSchema,
} from "@/lib/universal/schema/notifications";
import {
  cosmoAccounts,
  notifications,
  objektLists,
} from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

const PAGE_SIZE = 30;

/**
 * One page of the current user's notifications, newest first. The bell groups
 * the loaded rows into bursts. The cursor carries `created_at` as Postgres
 * text, which keeps the microseconds a JS Date would drop.
 */
export const $listNotifications = createServerFn({ method: "GET" })
  .validator(listNotificationsSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<NotificationPage> => {
    const after = decodeCursor(data.cursor);
    const rows = await db
      .select({
        id: notifications.id,
        createdAt: notifications.createdAt,
        cursorAt: sql<string>`${notifications.createdAt}::text`,
        type: notifications.type,
        readAt: notifications.readAt,
        actorId: notifications.actorId,
        username: cosmoAccounts.username,
        listId: objektLists.id,
        listSlug: objektLists.slug,
        collectionId: notifications.collectionId,
      })
      .from(notifications)
      .leftJoin(objektLists, eq(objektLists.id, notifications.listId))
      .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, notifications.actorId))
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

    const slugs = [
      ...new Set(
        rows.flatMap((r) => (r.collectionId === null ? [] : [r.collectionId])),
      ),
    ];
    const pageCollections =
      slugs.length === 0
        ? []
        : await indexer
            .select({
              slug: collections.slug,
              name: collections.collectionId,
              frontImage: collections.frontImage,
              frontImageVersion: collections.frontImageVersion,
            })
            .from(collections)
            .where(inArray(collections.slug, slugs));
    const collectionsBySlug = new Map<string, NotificationCollection>(
      pageCollections.map((c) => [c.slug, c]),
    );

    const last = rows.at(-1);
    return {
      // every type has an actor, a list and a collection (notifications_subject_chk)
      rows: rows.flatMap((row): NotificationRow[] =>
        row.actorId === null || row.listId === null || row.listSlug === null
          ? []
          : [
              {
                id: row.id,
                createdAt: row.createdAt,
                type: row.type,
                unread: row.readAt === null,
                actor: { userId: row.actorId, username: row.username },
                list: { id: row.listId, slug: row.listSlug },
                collection:
                  row.collectionId === null
                    ? null
                    : (collectionsBySlug.get(row.collectionId) ?? null),
              },
            ],
      ),
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
