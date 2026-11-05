import { isBanActive } from "@apollo/auth/guard";
import type { collections } from "@apollo/database/indexer/schema";
import type { user } from "@apollo/database/web/schema";
import type {
  Notification,
  TradeOffer,
  TradeOfferItem,
  TradeSide,
} from "@apollo/database/web/types";
import { objektFrontImageUrl } from "@apollo/image";
import type { MailObjekt, MailTradeSide, NotificationItem } from "@apollo/mail";
import { otherSide } from "@apollo/trades/lifecycle";
import {
  type EmailNotificationType,
  isEmailNotificationType,
  isOptedOut,
} from "@apollo/trades/notifications";

// a row older than this is stale news by the time it could be mailed
const MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * A notification as the claim returns it.
 */
type ClaimedNotification = Pick<
  Notification,
  "id" | "userId" | "type" | "createdAt" | "readAt" | "actorId" | "offerId"
>;

// a claimed row of a mailed type, unread and fresh enough to mail
type MailableNotification = ClaimedNotification & {
  type: EmailNotificationType;
};

/**
 * Whether a claimed row could be mailed before its recipient and trade are
 * read, so the run reads them only for these rows.
 */
export function isEmailable(
  row: ClaimedNotification,
  now: Date,
): row is MailableNotification {
  return (
    isEmailNotificationType(row.type) &&
    row.readAt === null &&
    now.getTime() - row.createdAt.getTime() <= MAX_AGE
  );
}

type Recipient = Pick<
  typeof user.$inferSelect,
  | "id"
  | "email"
  | "emailVerified"
  | "banned"
  | "banExpires"
  | "emailNotifications"
>;

/**
 * The trade or offer a row is about, with each party's COSMO username (null
 * once their account or link is gone).
 */
type NotifiedOffer = Pick<
  TradeOffer,
  "id" | "status" | "fromUserId" | "toUserId" | "deadlineAt" | "expiresAt"
> & { fromName: string | null; toName: string | null };

// what a trade or offer's party sends: an objekt by token, or a payment
type NotifiedItem = Pick<
  TradeOfferItem,
  "offerId" | "sender" | "kind" | "tokenId" | "amount" | "currency"
>;

// an objekt from the indexer, for its card
type NotifiedObjekt = {
  serial: number;
  collection: Pick<
    typeof collections.$inferSelect,
    | "slug"
    | "member"
    | "collectionNo"
    | "frontImage"
    | "frontImageVersion"
    | "backgroundColor"
    | "textColor"
  >;
};

type PlanInput = {
  rows: MailableNotification[];
  recipients: Map<string, Recipient>;
  offers: Map<string, NotifiedOffer>;
  // each offer's items in the order they were added
  items: Map<string, NotifiedItem[]>;
  // by token id
  objekts: Map<number, NotifiedObjekt>;
  now: Date;
  appUrl: (path: string) => string;
  // the CDN mirroring objekt images, for their URLs
  cdnUrl: string;
};

/**
 * One email for one user. `rowIds` are the rows it covers, released for the
 * next run when SES refuses it.
 */
type PlannedEmail = {
  userId: string;
  rowIds: string[];
  to: string;
  // most urgent first
  items: [NotificationItem, ...NotificationItem[]];
};

/**
 * Lower is more urgent. The subject comes from the most urgent row, and the
 * body lists rows in this order: a started send deadline first.
 */
const URGENCY = {
  offer_accepted: 0,
  listing_claimed: 1,
  trade_disputed: 2,
  trade_cancelled: 3,
  trade_dispute_resolved: 4,
  trade_deadline_extended: 5,
  offer_received: 6,
  offer_countered: 7,
} as const satisfies Record<EmailNotificationType, number>;

type EmailedRow = MailableNotification & {
  offer: NotifiedOffer;
  to: string;
};

/**
 * Both sides of a row's trade from the recipient's view. An objekt the
 * indexer doesn't know is left out, since there's nothing to draw.
 */
function tradeSides(row: EmailedRow, mine: TradeSide, input: PlanInput) {
  const items = input.items.get(row.offer.id) ?? [];
  const side = (sender: NotifiedItem["sender"]): MailTradeSide => ({
    objekts: items.flatMap((item): MailObjekt[] => {
      const objekt =
        item.sender === sender && item.tokenId !== null
          ? input.objekts.get(item.tokenId)
          : undefined;
      if (objekt === undefined) return [];
      const { collection } = objekt;
      return [
        {
          member: collection.member,
          collectionNo: collection.collectionNo,
          serial: objekt.serial,
          imageUrl: objektFrontImageUrl(input.cdnUrl, collection, "xs"),
          backgroundColor: collection.backgroundColor,
          textColor: collection.textColor,
        },
      ];
    }),
    payments: items.flatMap((item) =>
      item.sender === sender && item.amount !== null && item.currency !== null
        ? [{ amount: item.amount, currency: item.currency }]
        : [],
    ),
  });
  return { youGet: side(otherSide(mine)), youSend: side(mine) };
}

// the row as its email item: who, what each side sends, and its type's facts
function toItem(row: EmailedRow, input: PlanInput): NotificationItem {
  const { offer } = row;
  const mine = offer.fromUserId === row.userId ? "from" : "to";
  const base = {
    id: row.id,
    party: mine === "from" ? offer.toName : offer.fromName,
    url: input.appUrl(`/trade/${offer.id}`),
    ...tradeSides(row, mine, input),
  };
  switch (row.type) {
    case "offer_received":
    case "offer_countered":
      return { ...base, type: row.type, expiresAt: row.offer.expiresAt };
    case "offer_accepted":
    case "listing_claimed":
    case "trade_deadline_extended":
      return { ...base, type: row.type, deadlineAt: row.offer.deadlineAt };
    case "trade_cancelled":
    case "trade_disputed":
      // a null actor means staff acted, as the bell reads it
      return { ...base, type: row.type, byStaff: row.actorId === null };
    case "trade_dispute_resolved":
      return {
        ...base,
        type: row.type,
        outcome: row.offer.status === "cancelled" ? "cancelled" : "completed",
      };
  }
}

/**
 * Groups mailable rows into one email per user, dropping those whose trade is
 * gone or whose recipient can't be mailed.
 */
export function planEmails(input: PlanInput) {
  const { recipients, offers, now } = input;

  const emailed = input.rows.flatMap((row): EmailedRow[] => {
    const offer = row.offerId === null ? undefined : offers.get(row.offerId);
    const recipient = recipients.get(row.userId);
    if (offer === undefined || recipient === undefined) return [];
    if (!recipient.emailVerified || isBanActive(recipient, now)) return [];
    if (isOptedOut(recipient.emailNotifications, row.type)) return [];
    return [{ ...row, offer, to: recipient.email }];
  });

  return [...Map.groupBy(emailed, (row) => row.userId)].map(
    ([userId, rows]): PlannedEmail => {
      // most urgent first, newest first within a type
      const sorted = rows.toSorted(
        (a, b) =>
          URGENCY[a.type] - URGENCY[b.type] ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
      // Map.groupBy never makes an empty group
      const [first, ...rest] = sorted.map((row) => toItem(row, input));
      return {
        userId,
        rowIds: sorted.map((row) => row.id),
        to: sorted[0].to,
        items: [first, ...rest],
      };
    },
  );
}
