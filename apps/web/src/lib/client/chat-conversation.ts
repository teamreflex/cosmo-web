import type {
  ChatUnavailable,
  RateLimited,
  SessionEnded,
  TokenExpired,
} from "@apollo/chat/errors";
import { type ChatItem, isKnownEvent } from "@apollo/chat/items";
import type { RpcClientError } from "effect/rpc/RpcClientError";

/**
 * A trade's chat as the viewer reads it: messages and events oldest first,
 * with removals applied, and where the stream stands. It is `connecting`
 * until the history first arrives, and after a drop `reconnecting` until
 * it's back, either one `unreachable` once UNREACHABLE_AFTER joins in a row
 * have failed.
 */
export type Conversation = {
  items: readonly ChatItem[];
  connection:
    | { state: "live" }
    | { state: "connecting" | "reconnecting"; unreachable: boolean };
};

/**
 * What the Join stream feeds the conversation: its items, `CaughtUp`, and
 * `Down` with the failed joins in a row while it rejoins.
 */
export type ConversationUpdate =
  ChatItem | { _tag: "CaughtUp" } | { _tag: "Down"; failures: number };

// about 3 s of failed joins, past a blip
const UNREACHABLE_AFTER = 3;

export const noConversation: Conversation = {
  items: [],
  connection: { state: "connecting", unreachable: false },
};

/**
 * Adds a chunk of the stream to the conversation in one step. A removal
 * blanks its message in place, and its event stays as a marker.
 */
export function applyUpdates(
  conversation: Conversation,
  updates: readonly ConversationUpdate[],
): Conversation {
  const items = [...conversation.items];
  let { connection } = conversation;
  for (const update of updates) {
    switch (update._tag) {
      case "CaughtUp":
        connection = { state: "live" };
        break;
      case "Down":
        connection = {
          state:
            connection.state === "connecting" ? "connecting" : "reconnecting",
          unreachable: update.failures >= UNREACHABLE_AFTER,
        };
        break;
      case "Event": {
        const { event } = update;
        if (isKnownEvent(event) && event.type === "message_removed") {
          const index = items.findIndex(
            (item) => item._tag === "Message" && item.id === event.messageId,
          );
          const removed = items[index];
          if (removed?._tag === "Message") {
            items[index] = { ...removed, body: null, removed: true };
          }
        }
        items.push(update);
        break;
      }
      case "Message":
        items.push(update);
        break;
    }
  }
  return { items, connection };
}

// a Join that ended for a reason the viewer can rejoin after
export type RejoinCause =
  TokenExpired | SessionEnded | RateLimited | ChatUnavailable | RpcClientError;

// rejoins wait 1 s, 2 s, 4 s… up to this after failures in a row
const MAX_RETRY_MS = 15_000;

/**
 * How a Join rejoins after it ends: `fresh` when the server refused the
 * token, which is dropped for a new one, and `quiet` (at once, with no
 * reconnecting banner) for the first refusal in a row, such as a token
 * expiring or a role changing. Anything else, or a refusal straight after
 * another failure, backs off, or waits as long as a rate limit says.
 */
export function rejoinPlan(cause: RejoinCause, failures: number) {
  const fresh = cause._tag === "TokenExpired" || cause._tag === "SessionEnded";
  const quiet = fresh && failures === 0;
  const wait = quiet
    ? 0
    : cause._tag === "RateLimited"
      ? cause.retryAfterMs
      : Math.min(1000 * 2 ** failures, MAX_RETRY_MS);
  return { fresh, quiet, wait };
}
