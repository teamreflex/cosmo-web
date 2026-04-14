import { db } from "@/lib/server/db";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { notifications } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import * as z from "zod";

const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const markReadSchema = z.object({
  ids: z.array(z.uuid()).optional(),
});

/**
 * Fetch the current user's notifications, newest first.
 */
export const $listNotifications = createServerFn({ method: "GET" })
  .inputValidator(listNotificationsSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, context.session.session.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(data.limit)
      .offset(data.offset);
  });

/**
 * Mark notifications read. Pass an explicit list of IDs, or omit to mark all.
 */
export const $markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(markReadSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.session.userId;
    const now = new Date().toISOString();

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
 * Count unread notifications for the current user — used by the header badge.
 */
export const $unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await db.$count(
      notifications,
      and(
        eq(notifications.userId, context.session.session.userId),
        isNull(notifications.readAt),
      ),
    );
  });
