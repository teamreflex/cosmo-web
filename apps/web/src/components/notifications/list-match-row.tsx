import { m } from "@/i18n/messages";
import type {
  NotificationCollection,
  NotificationListItem,
} from "@/lib/universal/notifications";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { Link, linkOptions } from "@tanstack/react-router";
import UserAvatar from "../profile/user-avatar";
import { Timestamp } from "../ui/timestamp";
import { Thumbnail, Thumbnails, TypeBadge, UnreadDot } from "./row-parts";
import { bold, rowClassName } from "./row-utils";

type ListMatchItem = Extract<NotificationListItem, { kind: "list_match" }>;

/**
 * The actor's list, linked under their profile when they have one, the same
 * place `/list/$id` would redirect to.
 */
function listLink({ actor, list }: ListMatchItem) {
  return actor.username === null
    ? linkOptions({ to: "/list/$id", params: { id: list.id } })
    : linkOptions({
        to: "/@{$username}/list/$slug",
        params: { username: actor.username, slug: list.slug },
      });
}

export default function ListMatchRow({
  notification,
  onOpen,
}: {
  notification: ListMatchItem;
  onOpen: () => void;
}) {
  const username = notification.actor.username ?? m.notification_unknown_user();
  const [first] = notification.collections;
  const single = notification.itemCount === 1 ? first : undefined;

  return (
    <Link
      {...listLink(notification)}
      onClick={onOpen}
      data-unread={notification.unread}
      className={rowClassName}
    >
      <div className="relative h-fit shrink-0">
        <UserAvatar
          variant="square"
          username={username}
          className="size-8 text-sm"
        />
        <TypeBadge type={notification.type} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm wrap-anywhere text-foreground/80">
          {describeListMatch(notification, username, single)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timestamp date={notification.lastAt} relative="narrow" />
        </div>
        {single === undefined && (
          <Thumbnails
            collections={notification.collections}
            itemCount={notification.itemCount}
          />
        )}
      </div>

      {single !== undefined && <Thumbnail collection={single} />}
      {notification.unread && <UnreadDot />}
    </Link>
  );
}

/**
 * The row's sentence for each list-match type.
 */
function describeListMatch(
  notification: ListMatchItem,
  username: string,
  single: NotificationCollection | undefined,
) {
  const count = notification.itemCount;

  switch (notification.type) {
    case "trade_have":
      return single ? (
        <ParaglideMessage
          message={m.notification_trade_have_one}
          inputs={{ username, collection: single.name }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_have_many}
          inputs={{
            username,
            items: m.notification_trade_have_items({ count }),
          }}
          markup={bold}
        />
      );
    case "trade_want":
      return single ? (
        <ParaglideMessage
          message={m.notification_trade_want_one}
          inputs={{ username, collection: single.name }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_want_many}
          inputs={{
            username,
            items: m.notification_trade_want_items({ count }),
          }}
          markup={bold}
        />
      );
    default:
      notification.type satisfies never;
      return null;
  }
}
