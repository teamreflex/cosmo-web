import { can, type Role } from "@apollo/auth";
import {
  endedTradeStatuses,
  liveTradeStatuses,
  type TradeOfferStatus,
  type TradeSide,
} from "@apollo/database/web/types";
import * as Effect from "effect/Effect";
import {
  ChatNotFound,
  ChatReadOnly,
  Forbidden,
  StaffAccessRequired,
} from "./errors";

/**
 * Who may read and write a trade's chat. Every chat access is decided here,
 * from facts the server read itself.
 */

export type ChatViewer = { userId: string; role: Role };

export type ChatTrade = {
  status: TradeOfferStatus;
  fromUserId: string | null;
  toUserId: string | null;
};

/**
 * How the viewer reads the chat: as a party, or as staff under the open
 * report or dispute that lets them in.
 */
export type ChatAccess =
  | { kind: "party"; side: TradeSide }
  | { kind: "staff"; reportId: string };

// a conversation opens once an offer is accepted and stays readable after it ends
const chatStatuses: readonly TradeOfferStatus[] = [
  ...liveTradeStatuses,
  ...endedTradeStatuses,
];

const sendStatuses: readonly TradeOfferStatus[] = liveTradeStatuses;

/**
 * Parties are matched by user id, never by pinned address, so a deleted
 * party's side matches no one.
 */
function partySide(trade: ChatTrade, userId: string): TradeSide | null {
  if (trade.fromUserId === userId) {
    return "from";
  }
  return trade.toUserId === userId ? "to" : null;
}

/**
 * A party joins an accepted or later trade. Staff holding
 * `trade: ["read-any"]` join only while `openReportId` names an open report
 * or dispute on the trade or one of its messages. Anyone else is told the
 * chat doesn't exist.
 */
export function canJoinChat(
  viewer: ChatViewer,
  trade: ChatTrade,
  openReportId: string | null,
): Effect.Effect<ChatAccess, ChatNotFound | StaffAccessRequired> {
  const side = partySide(trade, viewer.userId);
  if (side !== null && chatStatuses.includes(trade.status)) {
    return Effect.succeed({ kind: "party", side });
  }
  if (side === null && can(viewer.role, { trade: ["read-any"] })) {
    return openReportId === null
      ? Effect.fail(new StaffAccessRequired())
      : Effect.succeed({ kind: "staff", reportId: openReportId });
  }
  return Effect.fail(new ChatNotFound());
}

// only a party writes, and only while the trade is live
export function canSendChat(
  access: ChatAccess,
  trade: ChatTrade,
): Effect.Effect<TradeSide, ChatReadOnly> {
  return access.kind === "party" && sendStatuses.includes(trade.status)
    ? Effect.succeed(access.side)
    : Effect.fail(new ChatReadOnly());
}

// a party reports the other party's messages, never their own or an event
export function canReportMessage(
  access: ChatAccess,
  message: { sender: TradeSide | null },
): Effect.Effect<void, Forbidden> {
  return access.kind === "party" &&
    message.sender !== null &&
    message.sender !== access.side
    ? Effect.void
    : Effect.fail(new Forbidden());
}

/**
 * Staff reading the chat under an open report remove messages with
 * `trade: ["remove-message"]`.
 */
export function canRemoveMessage(
  viewer: ChatViewer,
  access: ChatAccess,
): Effect.Effect<string, Forbidden> {
  return access.kind === "staff" &&
    can(viewer.role, { trade: ["remove-message"] })
    ? Effect.succeed(access.reportId)
    : Effect.fail(new Forbidden());
}
