import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import type {
  NotificationListItem,
  NotificationToken,
} from "@/lib/universal/notifications";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconTagOff } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import UserAvatar from "../profile/user-avatar";
import { Timestamp } from "../ui/timestamp";
import { Thumbnail, Thumbnails, TypeBadge, UnreadDot } from "./row-parts";
import { bold, rowClassName } from "./row-utils";

type TradeItem = Extract<NotificationListItem, { kind: "trade" }>;

/**
 * A trade notification links to its listing until trades have a page of
 * their own; one with no listing is a button, so opening it still marks it
 * read.
 */
export default function TradeRow({
  notification,
  onOpen,
}: {
  notification: TradeItem;
  onOpen: () => void;
}) {
  const { counterparty, objekts, token, offer } = notification;
  const username = counterparty?.username ?? m.notification_unknown_user();
  const shown = token ?? (objekts.length === 1 ? objekts[0] : undefined);
  const content = (
    <>
      {notification.type === "listing_closed" ? (
        // a closed listing has no other party, so its icon stands in
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-400">
          <IconTagOff className="size-4" />
        </div>
      ) : (
        <div className="relative h-fit shrink-0">
          {counterparty === null ? (
            <UserAvatar variant="square" deleted className="size-8 text-sm" />
          ) : (
            <UserAvatar
              variant="square"
              username={username}
              className="size-8 text-sm"
            />
          )}
          <TypeBadge type={notification.type} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm wrap-anywhere text-foreground/80">
          {describeTrade(notification, username)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timestamp date={notification.lastAt} relative="narrow" />
        </div>
        {objekts.length > 1 && (
          <Thumbnails
            collections={objekts.flatMap((o) =>
              o.collection === null ? [] : [o.collection],
            )}
            itemCount={objekts.length}
          />
        )}
      </div>

      {shown?.collection && <Thumbnail collection={shown.collection} />}
      {notification.unread && <UnreadDot />}
    </>
  );

  return offer.listingId === null ? (
    <button
      type="button"
      onClick={onOpen}
      data-unread={notification.unread}
      className={cn(rowClassName, "w-full text-left")}
    >
      {content}
    </button>
  ) : (
    <Link
      to="/market/listing/$id"
      params={{ id: offer.listingId }}
      onClick={onOpen}
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
