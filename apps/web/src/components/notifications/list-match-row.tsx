import { m } from "@/i18n/messages";
import type {
  NotificationCollection,
  NotificationListItem,
} from "@/lib/universal/notifications";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { Link, linkOptions } from "@tanstack/react-router";
import { RowAvatar, RowBody } from "./row-parts";
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
      <RowBody
        leading={<RowAvatar username={username} type={notification.type} />}
        sentence={describeListMatch(notification, username, single)}
        lastAt={notification.lastAt}
        single={single}
        strip={
          single === undefined
            ? {
                collections: notification.collections,
                itemCount: notification.itemCount,
              }
            : null
        }
        unread={notification.unread}
      />
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
