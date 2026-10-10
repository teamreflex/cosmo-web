export type NotificationType = "trade_have" | "trade_want";

export type NotificationCollection = {
  slug: string;
  name: string;
  frontImage: string;
  frontImageVersion: string | null;
};

/**
 * One notification as the bell's pages return it, newest first.
 * `collection` is null when the indexer no longer has the collection.
 */
export type NotificationRow = {
  id: string;
  createdAt: Date;
  type: NotificationType;
  unread: boolean;
  actor: { userId: string; username: string | null };
  list: { id: string; slug: string };
  collection: NotificationCollection | null;
};

export type NotificationPage = {
  rows: NotificationRow[];
  nextCursor: string | undefined;
};

/**
 * A burst of one actor's adds to one of their lists, grouped from the loaded
 * rows. `ids` are every loaded notification in it, for marking read.
 */
export type NotificationListItem = {
  type: NotificationType;
  ids: string[];
  lastAt: Date;
  unread: boolean;
  itemCount: number;
  actor: { userId: string; username: string | null };
  list: { id: string; slug: string };
  // the newest few, for the row's names and thumbnails
  collections: NotificationCollection[];
};

/**
 * A burst is a run of one user's notifications sharing type, actor, list and
 * read state, with no gap longer than this between neighbours.
 */
const BURST_GAP_MS = 6 * 60 * 60 * 1000;
const BURST_COLLECTIONS = 5;

/**
 * Group rows, newest first, into bursts ordered by their newest row.
 */
export function groupNotifications(rows: NotificationRow[]) {
  const bursts: NotificationListItem[] = [];
  // the open burst per partition, and the time of its oldest row so far
  const open = new Map<string, { burst: NotificationListItem; oldest: Date }>();

  for (const row of rows) {
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

    const burst: NotificationListItem = {
      type: row.type,
      ids: [row.id],
      lastAt: row.createdAt,
      unread: row.unread,
      itemCount: 1,
      actor: row.actor,
      list: row.list,
      collections: row.collection === null ? [] : [row.collection],
    };
    bursts.push(burst);
    open.set(key, { burst, oldest: row.createdAt });
  }

  return bursts;
}
