import type { Role } from "@apollo/auth";
import type { ChatAccess, ChatTrade } from "@apollo/chat/policy";
import { session, user } from "@apollo/database/auth";
import {
  cosmoAccounts,
  notifications,
  reportMessages,
  reports,
  staffAudit,
  tradeMessages,
  tradeOffers,
} from "@apollo/database/web/schema";
import type {
  MessageReportReason,
  TradeEvent,
} from "@apollo/database/web/types";
import { DatabaseWeb, type WebTx } from "@apollo/services/database-web";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";

/**
 * A database failure. It carries nothing from the statement, whose
 * parameters can hold ciphertext.
 */
export class StoreError extends Data.TaggedError("StoreError")<{}> {}

export type StoredSession = {
  userId: string;
  expiresAt: Date;
  impersonatedBy: string | null;
  role: Role;
  banned: boolean;
  banExpires: Date | null;
};

export type StoredTrade = ChatTrade & { id: string };

/**
 * A `trade_messages` row. A text row's body is ciphertext, null once staff
 * removed it (`removedAt`) or retention blanked it. `staff` is set on a
 * message staff wrote, with the name it shows under.
 */
export type StoredRow =
  | {
      kind: "text";
      id: number;
      tradeId: string;
      senderId: string | null;
      staff: { name: string | null } | null;
      body: Uint8Array | null;
      removedAt: Date | null;
      createdAt: Date;
    }
  | {
      kind: "event";
      id: number;
      tradeId: string;
      event: TradeEvent;
      createdAt: Date;
    };

export type StoredCopy = {
  messageId: number;
  tradeId: string;
  senderId: string | null;
  sentAt: Date;
  body: Uint8Array;
};

export type NewReport = {
  reporterId: string;
  reason: MessageReportReason;
  note: string | null;
  copy: StoredCopy;
};

export type Removal = {
  messageId: number;
  tradeId: string;
  staffId: string;
  reportId: string;
};

type Store<A> = Effect.Effect<A, StoreError>;

/**
 * Everything chat reads and writes, as single operations with no access
 * decisions in them. The live layer runs them against the web database;
 * tests use a Map-backed one.
 */
export class ChatStore extends Context.Service<
  ChatStore,
  {
    readonly session: (sessionId: string) => Store<StoredSession | null>;
    readonly trade: (tradeId: string) => Store<StoredTrade | null>;
    /**
     * An open or escalated report on the trade (a dispute) or on one of its
     * messages: what lets staff read the chat. `preferredId` wins while it's
     * one of them (the report staff act from), else the oldest.
     */
    readonly openReport: (
      tradeId: string,
      preferredId: string | null,
    ) => Store<string | null>;
    readonly rowsAfter: (
      tradeId: string,
      afterId: number,
      limit: number,
    ) => Store<ReadonlyArray<StoredRow>>;
    readonly row: (messageId: number) => Store<StoredRow | null>;
    /**
     * Inserts a text message and a `trade_message` notification for each
     * recipient who doesn't already have one unread from the sender for the
     * trade. A message sent as staff is flagged and audited as
     * `trade:message` under the report that lets them in.
     */
    readonly insertMessage: (message: {
      tradeId: string;
      senderId: string;
      as: ChatAccess;
      recipientIds: ReadonlyArray<string>;
      body: Uint8Array;
    }) => Store<number>;
    // the report's id, or null when the reporter already has one open on the message
    readonly insertReport: (report: NewReport) => Store<string | null>;
    /**
     * Blanks the message, posts `message_removed` and audits it. A message
     * already removed is left as it is.
     */
    readonly removeMessage: (removal: Removal) => Store<void>;
    readonly reportCopy: (reportId: string) => Store<StoredCopy | null>;
  }
>()("chat/ChatStore") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const db = yield* DatabaseWeb;
      return makeDrizzleStore(db);
    }),
  ).pipe(
    Layer.provide(DatabaseWeb.layer({ applicationName: "Chat", max: 10 })),
  );
}

const openStatuses = ["open", "escalated"] as const;

const rowColumns = {
  id: tradeMessages.id,
  tradeId: tradeMessages.tradeId,
  kind: tradeMessages.kind,
  senderId: tradeMessages.senderId,
  byStaff: tradeMessages.byStaff,
  // joined only on a staff message: their COSMO username, else their Apollo one
  staffName: sql<
    string | null
  >`coalesce(${cosmoAccounts.username}, ${user.username})`,
  body: tradeMessages.body,
  event: tradeMessages.event,
  removedAt: tradeMessages.removedAt,
  createdAt: tradeMessages.createdAt,
};

type Row = {
  id: number;
  tradeId: string;
  kind: "text" | "event";
  senderId: string | null;
  byStaff: boolean;
  staffName: string | null;
  body: Uint8Array | null;
  event: TradeEvent | null;
  removedAt: Date | null;
  createdAt: Date;
};

// trade_messages_kind_chk guarantees an event row has its event
function toStoredRow({ event, byStaff, staffName, ...row }: Row): StoredRow {
  if (row.kind === "event" && event !== null) {
    return { ...row, kind: "event", event };
  }
  return { ...row, kind: "text", staff: byStaff ? { name: staffName } : null };
}

/**
 * Locks the trade row the way web and schedules writes do before they add
 * timeline events, so writes to one trade's messages run one at a time.
 */
const lockTrade = (tx: WebTx, tradeId: string) =>
  tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(eq(tradeOffers.id, tradeId))
    .for("no key update");

const failed = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.tapError((error) =>
      Effect.logError("chat store failed").pipe(
        Effect.annotateLogs({
          error: error instanceof Error ? error.name : "unknown",
        }),
      ),
    ),
    Effect.mapError(() => new StoreError()),
  );

function makeDrizzleStore(db: DatabaseWeb["Service"]): ChatStore["Service"] {
  // a staff message joins its sender and their COSMO link for its name
  const selectRows = () =>
    db
      .select(rowColumns)
      .from(tradeMessages)
      .leftJoin(
        user,
        and(
          eq(user.id, tradeMessages.senderId),
          eq(tradeMessages.byStaff, true),
        ),
      )
      .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, user.id));

  return {
    session: (sessionId) =>
      db
        .select({
          userId: session.userId,
          expiresAt: session.expiresAt,
          impersonatedBy: session.impersonatedBy,
          role: user.role,
          banned: user.banned,
          banExpires: user.banExpires,
        })
        .from(session)
        .innerJoin(user, eq(user.id, session.userId))
        .where(eq(session.id, sessionId))
        .pipe(
          Effect.map(([row]) => row ?? null),
          failed,
        ),

    trade: (tradeId) =>
      db
        .select({
          id: tradeOffers.id,
          status: tradeOffers.status,
          fromUserId: tradeOffers.fromUserId,
          toUserId: tradeOffers.toUserId,
        })
        .from(tradeOffers)
        .where(and(eq(tradeOffers.id, tradeId), eq(tradeOffers.kind, "trade")))
        .pipe(
          Effect.map(([row]) => row ?? null),
          failed,
        ),

    openReport: (tradeId, preferredId) =>
      db
        .select({ id: reports.id })
        .from(reports)
        .where(
          and(
            inArray(reports.status, openStatuses),
            or(
              and(
                eq(reports.targetType, "trade"),
                eq(reports.targetId, tradeId),
              ),
              and(
                eq(reports.targetType, "message"),
                exists(
                  db
                    .select({ reportId: reportMessages.reportId })
                    .from(reportMessages)
                    .where(
                      and(
                        eq(reportMessages.reportId, reports.id),
                        eq(reportMessages.tradeId, tradeId),
                      ),
                    ),
                ),
              ),
            ),
          ),
        )
        .orderBy(
          desc(sql`${reports.id} = ${preferredId}`),
          asc(reports.createdAt),
        )
        .limit(1)
        .pipe(
          Effect.map(([row]) => row?.id ?? null),
          failed,
        ),

    rowsAfter: (tradeId, afterId, limit) =>
      selectRows()
        .where(
          and(
            eq(tradeMessages.tradeId, tradeId),
            gt(tradeMessages.id, afterId),
          ),
        )
        .orderBy(asc(tradeMessages.id))
        .limit(limit)
        .pipe(
          Effect.map((rows) => rows.map(toStoredRow)),
          failed,
        ),

    row: (messageId) =>
      selectRows()
        .where(eq(tradeMessages.id, messageId))
        .pipe(
          Effect.map(([row]) => (row === undefined ? null : toStoredRow(row))),
          failed,
        ),

    insertMessage: ({ tradeId, senderId, as, recipientIds, body }) =>
      db
        .transaction((tx) =>
          Effect.gen(function* () {
            /**
             * Users before the trade (docs/locking.md), for the
             * notifications' foreign keys. Every writer of a trade's messages
             * holds its trade row, so ids commit in order and a live stream
             * reading past its last id never skips one. A recipient whose
             * account was deleted since the trade was read is skipped.
             */
            const present = yield* tx
              .select({ id: user.id })
              .from(user)
              .where(inArray(user.id, [senderId, ...recipientIds]))
              .orderBy(asc(user.id))
              .for("key share");
            yield* lockTrade(tx, tradeId);
            const [inserted] = yield* tx
              .insert(tradeMessages)
              .values({
                tradeId,
                senderId,
                byStaff: as.kind === "staff",
                kind: "text",
                body: Buffer.from(body),
              })
              .returning({ id: tradeMessages.id });
            const messageId = inserted?.id ?? 0;
            for (const recipientId of recipientIds) {
              if (!present.some((row) => row.id === recipientId)) continue;
              const unread = yield* tx

                .select({ id: notifications.id })
                .from(notifications)
                .where(
                  and(
                    eq(notifications.userId, recipientId),
                    eq(notifications.offerId, tradeId),
                    eq(notifications.type, "trade_message"),
                    eq(notifications.actorId, senderId),
                    isNull(notifications.readAt),
                  ),
                )
                .limit(1);
              if (unread.length === 0) {
                yield* tx.insert(notifications).values({
                  userId: recipientId,
                  type: "trade_message",
                  actorId: senderId,
                  offerId: tradeId,
                });
              }
            }
            if (as.kind === "staff") {
              yield* tx.insert(staffAudit).values({
                staffId: senderId,
                action: "trade:message",
                targetType: "message",
                targetId: String(messageId),
                reportId: as.reportId,
                detail: { kind: "message", tradeId },
              });
            }
            return messageId;
          }),
        )
        .pipe(failed),

    insertReport: ({ reporterId, reason, note, copy }) =>
      db
        .transaction((tx) =>
          Effect.gen(function* () {
            const targetId = String(copy.messageId);
            const [open] = yield* tx
              .select({ id: reports.id })
              .from(reports)
              .where(
                and(
                  eq(reports.reporterId, reporterId),
                  eq(reports.targetType, "message"),
                  eq(reports.targetId, targetId),
                  inArray(reports.status, openStatuses),
                ),
              );
            if (open !== undefined) {
              return null;
            }
            const [report] = yield* tx
              .insert(reports)
              .values({
                reporterId,
                targetType: "message",
                targetId,
                reason,
                note,
              })
              .returning({ id: reports.id });
            if (report === undefined) {
              return null;
            }
            yield* tx.insert(reportMessages).values({
              ...copy,
              reportId: report.id,
              body: Buffer.from(copy.body),
            });
            return report.id;
          }),
        )
        .pipe(failed),

    removeMessage: ({ messageId, tradeId, staffId, reportId }) =>
      db
        .transaction((tx) =>
          Effect.gen(function* () {
            yield* lockTrade(tx, tradeId);
            const removed = yield* tx
              .update(tradeMessages)
              .set({ body: null, removedAt: new Date() })
              .where(
                and(
                  eq(tradeMessages.id, messageId),
                  eq(tradeMessages.kind, "text"),
                  isNull(tradeMessages.removedAt),
                ),
              )
              .returning({ id: tradeMessages.id });
            if (removed.length === 0) {
              return;
            }
            yield* tx.insert(tradeMessages).values({
              tradeId,
              kind: "event",
              event: { type: "message_removed", messageId },
            });
            yield* tx.insert(staffAudit).values({
              staffId,
              action: "trade:remove-message",
              targetType: "message",
              targetId: String(messageId),
              reportId,
              detail: { kind: "message", tradeId },
            });
          }),
        )
        .pipe(failed),

    reportCopy: (reportId) =>
      db
        .select({
          messageId: reportMessages.messageId,
          tradeId: reportMessages.tradeId,
          senderId: reportMessages.senderId,
          sentAt: reportMessages.sentAt,
          body: reportMessages.body,
        })
        .from(reportMessages)
        .where(eq(reportMessages.reportId, reportId))
        .pipe(
          Effect.map(([row]) => row ?? null),
          failed,
        ),
  };
}
