import {
  type ListMatchNotificationType,
  listMatchNotificationTypes,
  type NotificationType,
  type TradeNotificationType,
  type TradeOfferStatus,
  type TradeSide,
  tradeNotificationTypes,
} from "@apollo/database/web/types";

export function isListMatchNotification(
  type: NotificationType,
): type is ListMatchNotificationType {
  return listMatchNotificationTypes.some((listMatch) => listMatch === type);
}

// false for the enum's retired values, which nothing writes any more
export function isTradeNotification(
  type: NotificationType,
): type is TradeNotificationType {
  return tradeNotificationTypes.some((trade) => trade === type);
}

export type NotificationCollection = {
  slug: string;
  name: string;
  frontImage: string;
  frontImageVersion: string | null;
};

// `username` is null when the user has no COSMO link
type NotificationUser = { userId: string; username: string | null };

/**
 * A token a trade notification names. `serial` and `collection` are null
 * when the indexer no longer has it.
 */
export type NotificationToken = {
  tokenId: number;
  serial: number | null;
  collection: NotificationCollection | null;
};

/**
 * Who caused a trade notification: the recipient's other party, or a staff
 * member who wrote in the trade's chat, named by their COSMO username or
 * else their Apollo username (null when they have neither).
 */
export type TradeActor =
  | ({ kind: "party" } & NotificationUser)
  | { kind: "staff"; name: string | null };

/**
 * What a trade notification shows. `actor` is who caused it, or null when
 * staff acted unnamed or the system did. `counterparty` is the recipient's other
 * party, null on a listing or once their account is gone. `offer` is the
 * trade, or the listing for listing_closed. `objekts` is what the poster of
 * a listing_claimed or the sender of an offer_received sends, and `asked`
 * how many objekts that offer asks for in return. `tokenSender` is the side
 * whose objekt `token` is on offer_stale.
 */
type TradeNotificationFields = {
  kind: "trade";
  type: TradeNotificationType;
  unread: boolean;
  actor: TradeActor | null;
  counterparty: NotificationUser | null;
  offer: { id: string; status: TradeOfferStatus };
  token: NotificationToken | null;
  tokenSender: TradeSide | null;
  objekts: NotificationToken[];
  asked: number;
};

/**
 * One notification as the bell's pages return it, newest first. A list
 * match's `collection` is null when the indexer no longer has it.
 */
export type NotificationRow =
  | {
      kind: "list_match";
      id: string;
      createdAt: Date;
      type: ListMatchNotificationType;
      unread: boolean;
      actor: NotificationUser;
      list: { id: string; slug: string };
      collection: NotificationCollection | null;
    }
  | (TradeNotificationFields & { id: string; createdAt: Date });

export type NotificationPage = {
  rows: NotificationRow[];
  nextCursor: string | undefined;
};

/**
 * A row in the bell: a burst of one actor's adds to one of their lists, or a
 * single trade notification. `ids` are every loaded notification in it, for
 * marking read.
 */
export type NotificationListItem =
  | {
      kind: "list_match";
      type: ListMatchNotificationType;
      ids: string[];
      lastAt: Date;
      unread: boolean;
      itemCount: number;
      actor: NotificationUser;
      list: { id: string; slug: string };
      // the newest few, for the row's names and thumbnails
      collections: NotificationCollection[];
    }
  | (TradeNotificationFields & { ids: string[]; lastAt: Date });

type ListMatchBurst = Extract<NotificationListItem, { kind: "list_match" }>;

/**
 * A burst is a run of one user's list-match notifications sharing type,
 * actor, list and read state, with no gap longer than this between
 * neighbours.
 */
const BURST_GAP_MS = 6 * 60 * 60 * 1000;
const BURST_COLLECTIONS = 5;

/**
 * Group rows, newest first, into bursts ordered by their newest row. Trade
 * notifications each stand alone.
 */
export function groupNotifications(rows: NotificationRow[]) {
  const items: NotificationListItem[] = [];
  // the open burst per partition, and the time of its oldest row so far
  const open = new Map<string, { burst: ListMatchBurst; oldest: Date }>();

  for (const row of rows) {
    if (row.kind === "trade") {
      const { id, createdAt, ...fields } = row;
      items.push({ ...fields, ids: [id], lastAt: createdAt });
      continue;
    }

    const key = `${row.type}|${row.actor.userId}|${row.list.id}|${row.unread}`;
    const current = open.get(key);

    if (
      current !== undefined &&
      current.oldest.getTime() - row.createdAt.getTime() <= BURST_GAP_MS
    ) {
      current.burst.ids.push(row.id);
      current.burst.itemCount++;
      if (
        row.collection !== null &&
        current.burst.collections.length < BURST_COLLECTIONS
      ) {
        current.burst.collections.push(row.collection);
      }
      current.oldest = row.createdAt;
      continue;
    }

    const burst: ListMatchBurst = {
      kind: "list_match",
      type: row.type,
      ids: [row.id],
      lastAt: row.createdAt,
      unread: row.unread,
      itemCount: 1,
      actor: row.actor,
      list: row.list,
      collections: row.collection === null ? [] : [row.collection],
    };
    items.push(burst);
    open.set(key, { burst, oldest: row.createdAt });
  }

  return items;
}
