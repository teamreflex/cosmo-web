import { tradeMessages, tradeOffers } from "@apollo/database/web/schema";
import { DatabaseWeb } from "@apollo/services/database-web";
import { CHAT_RETENTION_DAYS } from "@apollo/trades/timers";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Blanks chat message bodies CHAT_RETENTION_DAYS after their trade ended. Events stay,
 * and so do reported messages' own copies (`report_messages`). Hourly, so
 * each run only meets the trades that crossed the line since the last one.
 */
export const chatRetentionTask = {
  name: "chat-retention",
  cron: "15 * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;
    const ended = db
      .select({ id: tradeOffers.id })
      .from(tradeOffers)
      .where(
        lt(
          tradeOffers.endedAt,
          sql`now() - make_interval(days => ${CHAT_RETENTION_DAYS})`,
        ),
      );
    const blanked = yield* db
      .update(tradeMessages)
      .set({ body: null })
      .where(
        and(
          eq(tradeMessages.kind, "text"),
          isNotNull(tradeMessages.body),
          inArray(tradeMessages.tradeId, ended),
        ),
      )
      .returning({ id: tradeMessages.id });
    if (blanked.length > 0) {
      yield* Effect.logInfo(
        `chat-retention blanked ${blanked.length} messages`,
      );
    }
  }),
} satisfies ScheduledTask;
