import { can, type Permissions, type Role } from "@apollo/auth";
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
import type { MessageSender } from "./items";

/**
 * Who may read and write a trade's chat. Every chat access is decided here,
 * from facts the server read itself.
 */

export type ChatViewer = { userId: string; role: Role };

/**
 * The trade as the viewer stands to it. `viewerPinned` is whether the COSMO
 * account the viewer links now is one of the trade's pinned addresses, which
 * outlive a deleted account.
 */
export type ChatTrade = {
  status: TradeOfferStatus;
  fromUserId: string | null;
  toUserId: string | null;
  viewerPinned: boolean;
};

/**
 * How the viewer reads the chat: as a party, as staff under an open report
 * or dispute on the trade or one of its messages, or as staff holding
 * `globalChatReading` who only read because nothing on the trade is open.
 */
export type ChatAccess =
  | { kind: "party"; side: TradeSide }
  | { kind: "staff"; reportId: string }
  | { kind: "reader" };

// who a message is sent as: a party, or staff under the report it's audited under
export type SendAccess = Exclude<ChatAccess, { kind: "reader" }>;

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

// read a trade's chat while it has an open report or dispute
export const chatReading = { trade: ["read-chat"] } satisfies Permissions;

// read every trade's chat, report or not
export const globalChatReading = {
  trade: ["read-chat-global"],
} satisfies Permissions;

// holding any one of these reads some trade's chat
export const chatReaders: Permissions[] = [chatReading, globalChatReading];

/**
 * A party joins an accepted or later trade. Staff holding `chatReading` or
 * `globalChatReading` join under `openReportId` while it names an open
 * report or dispute on the trade or one of its messages; with
 * `globalChatReading` they also join without one, only to read. Staff
 * holding only `chatReading` are told the chat is closed to them. A viewer
 * whose linked COSMO account is pinned on the trade but who isn't a party
 * deleted the account that was, so the trade is theirs, never staff's.
 * Anyone else is told the chat doesn't exist.
 */
export function canJoinChat(
  viewer: ChatViewer,
  trade: ChatTrade,
  openReportId: string | null,
): Effect.Effect<ChatAccess, ChatNotFound | StaffAccessRequired> {
  const side = partySide(trade, viewer.userId);
  if (side !== null) {
    return chatStatuses.includes(trade.status)
      ? Effect.succeed({ kind: "party", side })
      : Effect.fail(new ChatNotFound());
  }
  if (trade.viewerPinned) {
    return Effect.fail(new ChatNotFound());
  }
  const global = can(viewer.role, globalChatReading);
  const reportScoped = can(viewer.role, chatReading);
  if (openReportId !== null && (global || reportScoped)) {
    return Effect.succeed({ kind: "staff", reportId: openReportId });
  }
  if (global) {
    return Effect.succeed({ kind: "reader" });
  }
  return reportScoped
    ? Effect.fail(new StaffAccessRequired())
    : Effect.fail(new ChatNotFound());
}

// staff write to both parties while the trade has an open report
export const staffMessaging = { trade: ["message"] } satisfies Permissions;

/**
 * A party writes only while the trade is live. Staff holding
 * `staffMessaging` write while an open report or dispute lets them, ended
 * trades included, and are audited under it.
 */
export function canSendChat(
  viewer: ChatViewer,
  access: ChatAccess,
  trade: ChatTrade,
): Effect.Effect<SendAccess, ChatReadOnly | StaffAccessRequired> {
  switch (access.kind) {
    case "reader":
      return Effect.fail(new StaffAccessRequired());
    case "staff":
      return can(viewer.role, staffMessaging)
        ? Effect.succeed(access)
        : Effect.fail(new ChatReadOnly());
    case "party":
      return sendStatuses.includes(trade.status)
        ? Effect.succeed(access)
        : Effect.fail(new ChatReadOnly());
  }
}

// a party reports the other party's messages, never their own or a staff message
export function canReportMessage(
  access: ChatAccess,
  message: { sender: MessageSender | null },
): Effect.Effect<void, Forbidden> {
  return access.kind === "party" &&
    message.sender === (access.side === "from" ? "to" : "from")
    ? Effect.void
    : Effect.fail(new Forbidden());
}

/**
 * Staff reading the chat under an open report remove messages with
 * `trade: ["remove-message"]`, and are audited under it.
 */
export function canRemoveMessage(
  viewer: ChatViewer,
  access: ChatAccess,
): Effect.Effect<string, Forbidden | StaffAccessRequired> {
  if (access.kind === "reader") {
    return Effect.fail(new StaffAccessRequired());
  }
  return access.kind === "staff" &&
    can(viewer.role, { trade: ["remove-message"] })
    ? Effect.succeed(access.reportId)
    : Effect.fail(new Forbidden());
}
