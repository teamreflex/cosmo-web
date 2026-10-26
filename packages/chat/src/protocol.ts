import type { Role } from "@apollo/auth";
import { messageReportReasons } from "@apollo/database/web/types";
import * as Context from "effect/Context";
import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as RpcMiddleware from "effect/rpc/RpcMiddleware";
import * as Schema from "effect/Schema";
import {
  AlreadyReported,
  ChatNotFound,
  ChatReadOnly,
  ChatUnavailable,
  Forbidden,
  MessageNotFound,
  RateLimited,
  ReportNotFound,
  SessionEnded,
  StaffAccessRequired,
  TokenExpired,
  Unauthorized,
} from "./errors";
import {
  JoinItem,
  MAX_MESSAGE_LENGTH,
  MessageBody,
  MessageId,
  ReportId,
  TradeId,
  TradeSide,
} from "./items";

/**
 * The caller ChatAuth verified: the token's user and session, and the role
 * read from the database, never from the token.
 */
export class CurrentUser extends Context.Service<
  CurrentUser,
  { readonly userId: string; readonly sessionId: string; readonly role: Role }
>()("chat/CurrentUser") {}

/**
 * Authenticates every call from its `authorization: Bearer` header, and ends
 * it when the token expires or the user is disconnected. Clients provide the
 * half that attaches their current token.
 */
export class ChatAuth extends RpcMiddleware.Service<
  ChatAuth,
  { provides: CurrentUser }
>()("chat/ChatAuth", {
  error: Schema.Union([
    Unauthorized,
    TokenExpired,
    SessionEnded,
    ChatUnavailable,
  ]),
  requiredForClient: true,
}) {}

/**
 * The trade's history after `afterId`, `CaughtUp`, then its new messages and
 * events as they arrive.
 */
export const Join = Rpc.make("Join", {
  payload: { tradeId: TradeId, afterId: Schema.optionalKey(MessageId) },
  success: JoinItem,
  error: Schema.Union([
    ChatNotFound,
    StaffAccessRequired,
    RateLimited,
    ChatUnavailable,
  ]),
  stream: true,
});

/**
 * Staff writing from a report's page pass its id, so the message is audited
 * under that report while it's open on the trade.
 */
export const Send = Rpc.make("Send", {
  payload: {
    tradeId: TradeId,
    body: MessageBody,
    reportId: Schema.optionalKey(ReportId),
  },
  success: Schema.Struct({ messageId: MessageId }),
  error: Schema.Union([
    ChatNotFound,
    StaffAccessRequired,
    ChatReadOnly,
    RateLimited,
    ChatUnavailable,
  ]),
});

export const Report = Rpc.make("Report", {
  payload: {
    messageId: MessageId,
    reason: Schema.Literals(messageReportReasons),
    note: Schema.optionalKey(
      Schema.String.check(Schema.isMaxLength(MAX_MESSAGE_LENGTH)),
    ),
  },
  success: Schema.Struct({ reportId: ReportId }),
  error: Schema.Union([
    MessageNotFound,
    Forbidden,
    AlreadyReported,
    RateLimited,
    ChatUnavailable,
  ]),
});

// staff remove a message from a trade whose chat they may read, audited as Send is
export const Remove = Rpc.make("Remove", {
  payload: { messageId: MessageId, reportId: Schema.optionalKey(ReportId) },

  error: Schema.Union([
    MessageNotFound,
    Forbidden,
    StaffAccessRequired,
    ChatUnavailable,
  ]),
});

/**
 * The reported message as the report's own copy kept it, for staff
 * reviewing the report.
 */
export const ReportedMessage = Rpc.make("ReportedMessage", {
  payload: { reportId: ReportId },
  success: Schema.Struct({
    messageId: MessageId,
    tradeId: TradeId,
    sender: Schema.NullOr(TradeSide),
    sentAt: Schema.Date,
    body: MessageBody,
  }),
  error: Schema.Union([Forbidden, ReportNotFound, ChatUnavailable]),
});

export class ChatRpcs extends RpcGroup.make(
  Join,
  Send,
  Report,
  Remove,
  ReportedMessage,
).middleware(ChatAuth) {}
