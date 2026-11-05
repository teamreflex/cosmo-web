import type { NotificationItem } from "./content";
import { itemLine, partyName } from "./emails/_components/notification-items";

// an item's subject: its line, except where a subject reads better shorter
function itemSubject(item: NotificationItem, appName: string): string {
  const party = partyName(item);
  switch (item.type) {
    case "trade_disputed":
      return item.byStaff
        ? `Your trade with ${party} is paused for review`
        : itemLine(item, appName);
    case "trade_dispute_resolved":
      return `The dispute on your trade with ${party} was resolved`;
    default:
      return itemLine(item, appName);
  }
}

/**
 * The subject of a notification email: its first, most urgent item's, with
 * how many more it covers.
 */
export function notificationSubject(
  items: [NotificationItem, ...NotificationItem[]],
  appName: string,
) {
  const [first] = items;
  const subject = itemSubject(first, appName);
  return items.length === 1
    ? subject
    : `${subject} (+${items.length - 1} more)`;
}
