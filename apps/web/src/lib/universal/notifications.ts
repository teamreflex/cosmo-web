export const notificationKinds = ["all", "trade", "sale"] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export type NotificationCollection = {
  slug: string;
  name: string;
  frontImage: string;
  frontImageVersion: string | null;
};

/**
 * A listed serial as it stands now, in its sale list's currency.
 */
export type NotificationListing = {
  serial: number | null;
  price: number | null;
  currency: string;
};

/**
 * One actor's adds to one of their lists, grouped when read.
 */
type ListBurst = {
  actor: { userId: string; username: string | null };
  list: { id: string; slug: string };
  // the newest few, for the row's names and thumbnails
  collections: NotificationCollection[];
};

/**
 * A burst of notifications. `ids` are every notification in it, for marking
 * read.
 */
export type NotificationListItem = {
  ids: string[];
  lastAt: Date;
  unread: boolean;
  itemCount: number;
} & (
  | ({ type: "trade_have" | "trade_want" } & ListBurst)
  | ({
      type: "sale_listed";
      // the newest serial's listing; null once it's sold or removed
      listing: NotificationListing | null;
    } & ListBurst)
);
