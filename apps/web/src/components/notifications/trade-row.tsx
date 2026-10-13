import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import { tradeQuery } from "@/lib/queries/trades";
import type {
  NotificationListItem,
  NotificationToken,
} from "@/lib/universal/notifications";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconTagOff } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RowAvatar, RowBody } from "./row-parts";
import { bold, rowClassName } from "./row-utils";

type TradeItem = Extract<NotificationListItem, { kind: "trade" }>;

/**
 * A trade notification links to its trade, which opening it refreshes, and
 * a closed listing's to the listing.
 */
export default function TradeRow({
  notification,
  onOpen,
}: {
  notification: TradeItem;
  onOpen: () => void;
}) {
  const { counterparty, objekts, token, offer } = notification;
  const queryClient = useQueryClient();
  const username = counterparty?.username ?? m.notification_unknown_user();
  const shown = token ?? (objekts.length === 1 ? objekts[0] : undefined);
  const content = (
    <RowBody
      leading={
        notification.type === "listing_closed" ? (
          // a closed listing has no other party, so its icon stands in
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-400">
            <IconTagOff className="size-4" />
          </div>
        ) : (
          <RowAvatar
            username={counterparty === null ? null : username}
            type={notification.type}
          />
        )
      }
      sentence={describeTrade(notification, username)}
      lastAt={notification.lastAt}
      single={shown?.collection}
      strip={
        objekts.length > 1
          ? {
              collections: objekts.flatMap((o) =>
                o.collection === null ? [] : [o.collection],
              ),
              itemCount: objekts.length,
            }
          : null
      }
      unread={notification.unread}
    />
  );

  const closed = notification.type === "listing_closed";
  return (
    <Link
      to={closed ? "/market/listing/$id" : "/trade/$id"}
      params={{ id: offer.id }}
      onClick={() => {
        onOpen();
        if (!closed) {
          void queryClient.invalidateQueries({
            queryKey: tradeQuery(offer.id).queryKey,
          });
        }
      }}
      data-unread={notification.unread}
      className={rowClassName}
    >
      {content}
    </Link>
  );
}

// "Atom02 HeeJin 201Z #00217", or less when the indexer has lost it
function tokenName(token: NotificationToken | null | undefined) {
  if (!token?.collection) return m.notification_unknown_objekt();
  return token.serial === null
    ? token.collection.name
    : `${token.collection.name} ${formatSerial(token.serial)}`;
}

/**
 * The row's sentence for each trade type. A null actor means staff or the
 * system acted, which never names who.
 */
function describeTrade(notification: TradeItem, username: string) {
  const appName = env.VITE_APP_NAME;
  const staff = notification.actor === null;

  switch (notification.type) {
    case "listing_claimed": {
      const { objekts } = notification;
      return (
        <ParaglideMessage
          message={m.notification_listing_claimed}
          inputs={{
            username,
            objekts:
              objekts.length === 1
                ? tokenName(objekts[0])
                : m.notification_objekts_count({ count: objekts.length }),
          }}
          markup={bold}
        />
      );
    }
    case "trade_completed":
      return (
        <ParaglideMessage
          message={m.notification_trade_completed}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_timed_out":
      return (
        <ParaglideMessage
          message={m.notification_trade_timed_out}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_cancelled":
      return staff ? (
        <ParaglideMessage
          message={m.notification_trade_cancelled_staff}
          inputs={{ appName, username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_cancelled}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_disputed":
      return staff ? (
        <ParaglideMessage
          message={m.notification_trade_disputed_staff}
          inputs={{ appName, username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_disputed}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_dispute_resolved":
      return (
        <ParaglideMessage
          message={
            notification.offer.status === "cancelled"
              ? m.notification_trade_dispute_resolved_cancelled
              : m.notification_trade_dispute_resolved_completed
          }
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_deadline_extended":
      return (
        <ParaglideMessage
          message={m.notification_trade_deadline_extended}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_token_moved":
      return (
        <ParaglideMessage
          message={m.notification_trade_token_moved}
          inputs={{ objekt: tokenName(notification.token), username }}
          markup={bold}
        />
      );
    case "trade_token_untransferable":
      return (
        <ParaglideMessage
          message={m.notification_trade_token_untransferable}
          inputs={{ objekt: tokenName(notification.token), username }}
          markup={bold}
        />
      );
    case "listing_closed":
      return (
        <ParaglideMessage
          message={m.notification_listing_closed}
          inputs={{ objekt: tokenName(notification.token) }}
          markup={bold}
        />
      );
    default:
      notification.type satisfies never;
      return null;
  }
}
