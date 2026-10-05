import { notifications } from "@apollo/database/web/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";

/**
 * A burst is a run of one user's notifications sharing type, actor, list and
 * read state, with no gap longer than this between neighbours.
 */
const BURST_GAP = sql.raw(`interval '6 hours'`);

/**
 * The bell groups only this many of the newest rows,
 * so its cost stays flat however long a user's history grows.
 */
const RECENT_ROWS = 500;

/**
 * The user's newest notifications, or all of their unread ones, each flagged
 * when it starts a new burst. The unread set stays on the partial unread index.
 */
export function markedNotifications(userId: string, rows: "recent" | "unread") {
  const source =
    rows === "recent"
      ? db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt))
          .limit(RECENT_ROWS)
          .as("source")
      : db
          .select()
          .from(notifications)
          .where(
            and(eq(notifications.userId, userId), isNull(notifications.readAt)),
          )
          .as("source");
  const partition = sql`partition by ${source.type}, ${source.actorId}, ${source.listId}, ${source.readAt} is null order by ${source.createdAt}`;

  return db.$with("marked").as(
    db
      .select({
        id: source.id,
        createdAt: source.createdAt,
        type: source.type,
        actorId: source.actorId,
        listId: source.listId,
        collectionId: source.collectionId,
        entryId: source.entryId,
        unread: sql<boolean>`${source.readAt} is null`.as("unread"),
        startsBurst: sql<number>`case
          when ${source.createdAt} - lag(${source.createdAt}) over (${partition}) <= ${BURST_GAP}
          then 0 else 1
        end`.as("starts_burst"),
      })
      .from(source),
  );
}
