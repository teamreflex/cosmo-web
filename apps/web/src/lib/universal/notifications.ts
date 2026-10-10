export type NotificationCollection = {
  slug: string;
  name: string;
  frontImage: string;
  frontImageVersion: string | null;
};

/**
 * A burst of one actor's adds to one of their lists, grouped when read.
 * `ids` are every notification in it, for marking read.
 */
export type NotificationListItem = {
  type: "trade_have" | "trade_want";
  ids: string[];
  lastAt: Date;
  unread: boolean;
  itemCount: number;
  actor: { userId: string; username: string | null };
  list: { id: string; slug: string };
  // the newest few, for the row's names and thumbnails
  collections: NotificationCollection[];
};
