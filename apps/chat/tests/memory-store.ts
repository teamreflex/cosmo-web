import type { MessageReportReason } from "@apollo/database/web/types";
import { Context, Effect, Layer } from "effect";
import {
  ChatStore,
  type StoredCopy,
  type StoredRow,
  type StoredSession,
  type StoredTrade,
} from "../src/store";

export type MemoryReport = {
  id: string;
  reporterId: string | null;
  targetType: "trade" | "message";
  targetId: string;
  status: "open" | "escalated" | "resolved" | "dismissed";
  reason: MessageReportReason | "not_responding";
  note: string | null;
};

export type MemoryNotification = {
  userId: string;
  actorId: string;
  offerId: string;
  readAt: Date | null;
};

export type MemoryAudit = {
  staffId: string;
  action: "trade:remove-message" | "trade:message";
  targetId: string;
  reportId: string;
};

/**
 * A `trade_messages` row as the table holds it: a text row carries the
 * `by_staff` flag, and its name is read with the row.
 */
export type MemoryRow =
  | (Omit<Extract<StoredRow, { kind: "text" }>, "staff"> & {
      byStaff: boolean;
    })
  | Extract<StoredRow, { kind: "event" }>;

/**
 * The rows the Map store holds, open to tests for seeding and assertions.
 * `names` stands in for staff members' COSMO or Apollo usernames.
 */
export type MemoryState = {
  sessions: Map<string, StoredSession>;
  trades: Map<string, StoredTrade>;
  names: Map<string, string>;
  rows: MemoryRow[];
  reports: MemoryReport[];
  copies: Map<string, StoredCopy>;
  notifications: MemoryNotification[];
  audit: MemoryAudit[];
  // trade_messages ids, shared by messages and events so they only grow
  nextId: number;
};

export function makeState(): MemoryState {
  return {
    sessions: new Map(),
    trades: new Map(),
    names: new Map(),
    rows: [],
    reports: [],
    copies: new Map(),
    notifications: [],
    audit: [],
    nextId: 1,
  };
}

export class Memory extends Context.Service<Memory, MemoryState>()(
  "test/Memory",
) {}

const isOpen = (report: MemoryReport) =>
  report.status === "open" || report.status === "escalated";

/**
 * ChatStore over a MemoryState, with the live store's semantics: ids only
 * grow, a removal blanks the body and posts `message_removed`, and a
 * reporter has one open report per message.
 */
export function memoryStoreLayer(state: MemoryState) {
  const append = (row: MemoryRow) => {
    state.rows.push(row);
    return row.id;
  };

  // a staff message is named while its sender's account exists
  const toStoredRow = (row: MemoryRow): StoredRow => {
    if (row.kind === "event") {
      return row;
    }
    const { byStaff, ...text } = row;
    return {
      ...text,
      staff: byStaff
        ? {
            name:
              row.senderId === null
                ? null
                : (state.names.get(row.senderId) ?? null),
          }
        : null,
    };
  };

  const store: ChatStore["Service"] = {
    session: (sessionId) =>
      Effect.sync(() => state.sessions.get(sessionId) ?? null),
    trade: (tradeId) => Effect.sync(() => state.trades.get(tradeId) ?? null),
    openReport: (tradeId) =>
      Effect.sync(() => {
        const report = state.reports.find(
          (each) =>
            isOpen(each) &&
            ((each.targetType === "trade" && each.targetId === tradeId) ||
              (each.targetType === "message" &&
                state.copies.get(each.id)?.tradeId === tradeId)),
        );
        return report?.id ?? null;
      }),
    rowsAfter: (tradeId, afterId, limit) =>
      Effect.sync(() =>
        state.rows
          .filter((row) => row.tradeId === tradeId && row.id > afterId)
          .slice(0, limit)
          .map(toStoredRow),
      ),
    row: (messageId) =>
      Effect.sync(() => {
        const row = state.rows.find((each) => each.id === messageId);
        return row === undefined ? null : toStoredRow(row);
      }),
    insertMessage: ({ tradeId, senderId, as, recipientIds, body }) =>
      Effect.sync(() => {
        const id = append({
          kind: "text",
          id: state.nextId++,
          tradeId,
          senderId,
          byStaff: as.kind === "staff",
          body,
          removedAt: null,
          createdAt: new Date(),
        });
        for (const recipientId of recipientIds) {
          if (
            !state.notifications.some(
              (each) =>
                each.userId === recipientId &&
                each.offerId === tradeId &&
                each.actorId === senderId &&
                each.readAt === null,
            )
          ) {
            state.notifications.push({
              userId: recipientId,
              actorId: senderId,
              offerId: tradeId,
              readAt: null,
            });
          }
        }
        if (as.kind === "staff") {
          state.audit.push({
            staffId: senderId,
            action: "trade:message",
            targetId: String(id),
            reportId: as.reportId,
          });
        }
        return id;
      }),
    insertReport: ({ reporterId, reason, note, copy }) =>
      Effect.sync(() => {
        const targetId = String(copy.messageId);
        if (
          state.reports.some(
            (each) =>
              isOpen(each) &&
              each.reporterId === reporterId &&
              each.targetType === "message" &&
              each.targetId === targetId,
          )
        ) {
          return null;
        }
        const id = crypto.randomUUID();
        state.reports.push({
          id,
          reporterId,
          targetType: "message",
          targetId,
          status: "open",
          reason,
          note,
        });
        state.copies.set(id, copy);
        return id;
      }),
    removeMessage: ({ messageId, tradeId, staffId, reportId }) =>
      Effect.sync(() => {
        const index = state.rows.findIndex(
          (row) =>
            row.id === messageId &&
            row.kind === "text" &&
            row.removedAt === null,
        );
        const row = state.rows[index];
        if (row === undefined || row.kind !== "text") {
          return;
        }
        state.rows[index] = { ...row, body: null, removedAt: new Date() };
        append({
          kind: "event",
          id: state.nextId++,
          tradeId,
          event: { type: "message_removed", messageId },
          createdAt: new Date(),
        });
        state.audit.push({
          staffId,
          action: "trade:remove-message",
          targetId: String(messageId),
          reportId,
        });
      }),
    reportCopy: (reportId) =>
      Effect.sync(() => state.copies.get(reportId) ?? null),
  };

  return Layer.mergeAll(
    Layer.succeed(ChatStore, store),
    Layer.succeed(Memory, state),
  );
}

// an event row, as the web app and schedules write them
export function appendEvent(
  state: MemoryState,
  tradeId: string,
  event: Extract<StoredRow, { kind: "event" }>["event"],
) {
  const id = state.nextId++;
  state.rows.push({ kind: "event", id, tradeId, event, createdAt: new Date() });
  return id;
}
