import { type ChatItem, isStaffSender } from "@apollo/chat/items";
import type { TradeSide } from "@apollo/database/web/types";

export type ChatMessage = Extract<ChatItem, { _tag: "Message" }>;
export type ChatEvent = Extract<ChatItem, { _tag: "Event" }>;

export type ChatRow =
  | { kind: "day"; key: string; date: Date }
  | { kind: "event"; key: string; event: ChatEvent }
  | {
      kind: "message";
      key: string;
      message: ChatMessage;
      // the first of a run from one sender, which carries a shown name
      first: boolean;
      // the last of a run, which carries the time
      last: boolean;
    };

const dayOf = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/**
 * Staff messages run together only from the same named staff member, never
 * with a party's.
 */
function sameSender(a: ChatMessage["sender"], b: ChatMessage["sender"]) {
  return isStaffSender(a) && isStaffSender(b)
    ? a.name !== null && a.name === b.name
    : a === b;
}

/**
 * The rows a chat renders: a divider where the day changes, a marker per
 * event, and the messages grouped into runs from one sender. An event
 * between two messages ends the run.
 */
export function chatRows(items: readonly ChatItem[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let day: string | null = null;

  for (const item of items) {
    const date = item._tag === "Message" ? item.sentAt : item.at;
    if (dayOf(date) !== day) {
      day = dayOf(date);
      rows.push({ kind: "day", key: `d:${day}`, date });
    }
    if (item._tag === "Event") {
      rows.push({ kind: "event", key: `e:${item.id}`, event: item });
      continue;
    }
    const previous = rows.at(-1);
    const continues =
      previous?.kind === "message" &&
      sameSender(previous.message.sender, item.sender);
    if (continues) {
      rows[rows.length - 1] = { ...previous, last: false };
    }
    rows.push({
      kind: "message",
      key: `m:${item.id}`,
      message: item,
      first: !continues,
      last: true,
    });
  }

  return rows;
}

/**
 * How many messages from the other party or staff came after `afterId`.
 * Staff have no side, so nothing is unread for them.
 */
export function unreadAfter(
  items: readonly ChatItem[],
  side: TradeSide | null,
  afterId: number,
) {
  return side === null
    ? 0
    : items.filter(
        (item) =>
          item._tag === "Message" && item.id > afterId && item.sender !== side,
      ).length;
}
