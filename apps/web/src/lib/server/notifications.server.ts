import { BURST_GAP_HOURS } from "@/lib/universal/notifications";
import { notifications } from "@apollo/database/web/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";

const BURST_GAP = sql.raw(`interval '${BURST_GAP_HOURS} hours'`);

/**
 * Count the user's unread bursts by the rule `groupNotifications` groups the
 * bell's rows with. Reads only unread rows, which the partial unread index serves.
 */
export async function countUnreadBursts(userId: string) {
  const unread = db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .as("unread");
  const marked = db.$with("marked").as(
    db
      .select({
        startsBurst: sql<number>`case
          when ${unread.createdAt} - lag(${unread.createdAt}) over (
            partition by ${unread.type}, ${unread.actorId}, ${unread.listId}
            order by ${unread.createdAt}
          ) <= ${BURST_GAP}
          then 0 else 1
        end`.as("starts_burst"),
      })
      .from(unread),
  );

  const [row] = await db
    .with(marked)
    .select({
      count:
        sql<number>`count(*) filter (where ${marked.startsBurst} = 1)::int`.mapWith(
          Number,
        ),
    })
    .from(marked);
  return row?.count ?? 0;
}
