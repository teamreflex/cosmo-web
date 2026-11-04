import type { NotificationType } from "@apollo/database/web/types";
import * as z from "zod";

/**
 * The notification types send-notification-emails mails, each with its bit in
 * `user.email_notifications`, an opt-out mask: a set bit means the user turned
 * that type's email off. Every other type is bell-only. Stored masks depend on
 * these positions, so never reorder them or reuse a retired one.
 */
const EMAIL_NOTIFICATION_BITS = {
  offer_received: 0,
  offer_countered: 1,
  offer_accepted: 2,
  listing_claimed: 3,
  trade_cancelled: 4,
  trade_disputed: 5,
  trade_dispute_resolved: 6,
  trade_deadline_extended: 7,
} as const satisfies Partial<Record<NotificationType, number>>;
export type EmailNotificationType = keyof typeof EMAIL_NOTIFICATION_BITS;

// the switches on /account#notifications, each covering a group of types
const emailNotificationCategories = {
  offers: ["offer_received", "offer_countered", "offer_accepted"],
  activeTrades: ["listing_claimed", "trade_cancelled"],
  disputes: [
    "trade_disputed",
    "trade_dispute_resolved",
    "trade_deadline_extended",
  ],
} as const satisfies Record<string, readonly EmailNotificationType[]>;
export type EmailNotificationCategory =
  keyof typeof emailNotificationCategories;

function maskOf(bits: readonly number[]) {
  return bits.reduce((mask, bit) => mask | (1 << bit), 0);
}

function categoryMask(category: EmailNotificationCategory) {
  return maskOf(
    emailNotificationCategories[category].map(
      (type) => EMAIL_NOTIFICATION_BITS[type],
    ),
  );
}

// what clients may store in `user.email_notifications`: any mask of defined bits
export const emailNotificationsSchema = z
  .int()
  .min(0)
  .max(maskOf(Object.values(EMAIL_NOTIFICATION_BITS)));

export function isEmailNotificationType(
  type: NotificationType,
): type is EmailNotificationType {
  return Object.hasOwn(EMAIL_NOTIFICATION_BITS, type);
}

export function isOptedOut(mask: number, type: EmailNotificationType) {
  return (mask & (1 << EMAIL_NOTIFICATION_BITS[type])) !== 0;
}

// a category's switch is on while none of its types are opted out
export function isCategoryEnabled(
  mask: number,
  category: EmailNotificationCategory,
) {
  return (mask & categoryMask(category)) === 0;
}

export function setCategoryEnabled(
  mask: number,
  category: EmailNotificationCategory,
  enabled: boolean,
) {
  const bits = categoryMask(category);
  return enabled ? mask & ~bits : mask | bits;
}
