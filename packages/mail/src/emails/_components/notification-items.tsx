import { accountName } from "@apollo/util";
import { Section, Text } from "react-email";
import type { NotificationItem } from "../../content";
import { ActionButton } from "./layout";
import type { RenderConfig } from "./layout";
import { TradeSummary } from "./objekts";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Users' timezones aren't stored, so times are shown in UTC and named so.
 */
function formatTime(date: Date) {
  return `${dateFormat.format(date)} UTC`;
}

// named as the bell names them
export function partyName(item: NotificationItem) {
  return item.party === null ? "Deleted user" : accountName(item.party);
}

/**
 * What a notification says, without its full stop. It is also the inbox
 * preview line when it leads its email, and the subject for most types.
 */
export function itemLine(item: NotificationItem, appName: string): string {
  const party = partyName(item);
  switch (item.type) {
    case "offer_received":
      return `${party} sent you an offer`;
    case "offer_countered":
      return `${party} countered your offer`;
    case "offer_accepted":
      return `${party} accepted your offer`;
    case "listing_claimed":
      return `${party} accepted your listing`;
    case "trade_deadline_extended":
      return `A moderator gave your trade with ${party} more time`;
    case "trade_cancelled":
      return item.byStaff
        ? `${appName} staff cancelled your trade with ${party}`
        : `${party} cancelled your trade`;
    case "trade_disputed":
      return item.byStaff
        ? `${appName} staff paused your trade with ${party} for review`
        : `${party} opened a dispute on your trade`;
    case "trade_dispute_resolved":
      return `A moderator resolved the dispute on your trade with ${party}: ${item.outcome}`;
  }
}

// the muted line under it: what the recipient must do, and by when
function itemDetail(item: NotificationItem): string | null {
  switch (item.type) {
    case "offer_received":
    case "offer_countered":
      return item.expiresAt === null
        ? null
        : `It expires unanswered at ${formatTime(item.expiresAt)}.`;
    case "offer_accepted":
    case "listing_claimed":
    case "trade_deadline_extended":
      return item.deadlineAt === null
        ? null
        : `Send your side by ${formatTime(item.deadlineAt)}.`;
    case "trade_disputed":
      return "The trade is frozen until a moderator settles it.";
    case "trade_cancelled":
    case "trade_dispute_resolved":
      return null;
  }
}

/**
 * One notification: its line, what to do by when, both sides of its trade,
 * and a button to its offer or trade.
 */
export function NotificationItemView({
  item,
  config,
}: {
  item: NotificationItem;
  config: RenderConfig;
}) {
  const detail = itemDetail(item);
  return (
    <>
      <Text className="m-0 text-[15px] leading-[24px]">
        {itemLine(item, config.appName)}.
      </Text>
      {detail === null ? null : (
        <Text className="m-0 mt-1 text-[14px] leading-[22px] text-muted">
          {detail}
        </Text>
      )}
      <TradeSummary youGet={item.youGet} youSend={item.youSend} />
      <Section className="pt-5">
        <ActionButton
          label={
            item.type === "offer_received" || item.type === "offer_countered"
              ? "View offer"
              : "View trade"
          }
          url={item.url}
        />
      </Section>
    </>
  );
}
