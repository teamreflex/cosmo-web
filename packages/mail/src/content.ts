import type { ReactElement } from "react";

/**
 * An objekt drawn as a card: its front image, or in clients that can't show
 * the WebP image, a card in its collection's colours with its number.
 */
export type MailObjekt = {
  member: string;
  // printed on the fallback card, e.g. "201Z"
  collectionNo: string;
  serial: number;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
};

// a numeric amount as Postgres returns it, e.g. "20.00", and its ISO 4217 code
export type MailPayment = { amount: string; currency: string };

// what one party of a trade sends
export type MailTradeSide = {
  objekts: MailObjekt[];
  payments: MailPayment[];
};

type NotificationItemBase = {
  // the notification's row id
  id: string;
  // the recipient's counterparty's COSMO username, null once their account or link is gone
  party: string | null;
  // the trade or offer page
  url: string;
  youGet: MailTradeSide;
  youSend: MailTradeSide;
};

/**
 * One notification in a notification email, carrying data rather than copy:
 * each type's wording lives in its component and `notificationSubject()`.
 */
export type NotificationItem = NotificationItemBase &
  (
    | ({ type: "offer_received" } & Expiring)
    | ({ type: "offer_countered" } & Expiring)
    | ({ type: "offer_accepted" } & Deadlined)
    | ({ type: "listing_claimed" } & Deadlined)
    | ({ type: "trade_deadline_extended" } & Deadlined)
    | { type: "trade_cancelled"; byStaff: boolean }
    | { type: "trade_disputed"; byStaff: boolean }
    | { type: "trade_dispute_resolved"; outcome: "completed" | "cancelled" }
  );

// when a pending offer expires unanswered
type Expiring = { expiresAt: Date | null };
// when a live trade's send deadline passes
type Deadlined = { deadlineAt: Date | null };

// `body` is the filled-in template, rendered by `send()`
export type Mail = { to: string; subject: string; body: ReactElement };
