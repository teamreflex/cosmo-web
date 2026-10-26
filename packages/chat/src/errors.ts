import * as ErrorReporter from "effect/ErrorReporter";
import * as Schema from "effect/Schema";

/**
 * The chat protocol's errors. They carry no message text or token. Every
 * error a client causes is expected and hidden from the error reporter;
 * `ChatUnavailable` is the server's own failure, so it stays reported.
 */

// a missing or forged token, an impersonated session or an active ban
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

// the token reached its `exp`; the client fetches a new one and rejoins
export class TokenExpired extends Schema.TaggedError<TokenExpired>()(
  "TokenExpired",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

/**
 * The token's session ended or the user was disconnected. The client
 * fetches a new token and rejoins, which a signed-out user can't.
 */
export class SessionEnded extends Schema.TaggedError<SessionEnded>()(
  "SessionEnded",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class ChatUnavailable extends Schema.TaggedError<ChatUnavailable>()(
  "ChatUnavailable",
  {},
) {}

// no such trade, or not one the caller may read; the two look the same
export class ChatNotFound extends Schema.TaggedError<ChatNotFound>()(
  "ChatNotFound",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

// staff read a chat only while it has an open report or dispute
export class StaffAccessRequired extends Schema.TaggedError<StaffAccessRequired>()(
  "StaffAccessRequired",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

// the trade has ended, or the caller is staff
export class ChatReadOnly extends Schema.TaggedError<ChatReadOnly>()(
  "ChatReadOnly",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class RateLimited extends Schema.TaggedError<RateLimited>()(
  "RateLimited",
  { retryAfterMs: Schema.Number },
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class MessageNotFound extends Schema.TaggedError<MessageNotFound>()(
  "MessageNotFound",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class AlreadyReported extends Schema.TaggedError<AlreadyReported>()(
  "AlreadyReported",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}

export class ReportNotFound extends Schema.TaggedError<ReportNotFound>()(
  "ReportNotFound",
  {},
) {
  override readonly [ErrorReporter.ignore] = true;
}
