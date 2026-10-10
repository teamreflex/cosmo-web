import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { $markNotificationsRead } from "@/lib/functions/notifications";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import {
  groupNotifications,
  type NotificationCollection,
  type NotificationListItem,
} from "@/lib/universal/notifications";
import type { MarkNotificationsRead } from "@/lib/universal/schema/notifications";
import {
  IconArrowsExchange,
  IconBell,
  IconChecks,
  IconLoader2,
} from "@tabler/icons-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, linkOptions, useLocation } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useOnInView } from "react-intersection-observer";
import UserAvatar from "../profile/user-avatar";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";

const MAX_THUMBNAILS = 5;

export default function NotificationBell() {
  // remembering where the popover was opened closes it on any navigation
  const pathname = useLocation({ select: (location) => location.pathname });
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const queryClient = useQueryClient();
  const unread = useQuery(unreadNotificationsQuery);
  const list = useInfiniteQuery({ ...notificationsListQuery, enabled: open });
  const markRead = useMarkRead();

  const count = unread.data ?? 0;
  const bursts = groupNotifications(
    list.data?.pages.flatMap((page) => page.rows) ?? [],
  );
  const fresh = bursts.filter((n) => n.unread);
  const earlier = bursts.filter((n) => !n.unread);

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpenedOn(open ? pathname : null);
        // the list refetches on open, so the badge catches up with it
        if (open) {
          void queryClient.invalidateQueries({
            queryKey: unreadNotificationsQuery.queryKey,
          });
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              count > 0
                ? m.notification_bell_label_unread({ count })
                : m.notification_bell_label()
            }
            className="relative"
          />
        }
      >
        <IconBell className="size-6" />
        {count > 0 && (
          <div
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cosmo px-1 text-xs font-semibold text-white tabular-nums ring-2 ring-background"
          >
            {count > 99 ? "99+" : count}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 max-w-[calc(100vw-1rem)] gap-0 p-0"
      >
        <header className="flex h-12 items-center justify-between border-b pr-2 pl-3.5">
          <h4 className="text-sm font-semibold">
            {m.notification_bell_label()}
          </h4>

          {count > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.notification_mark_all_read()}
              title={m.notification_mark_all_read()}
              onClick={() => markRead.mutate({ all: true })}
              disabled={markRead.isPending}
            >
              <IconChecks />
            </Button>
          )}
        </header>

        {/* a flex column lets the viewport shrink to the max height and scroll */}
        <ScrollArea className="flex max-h-[28rem] flex-col">
          {list.isPending && (
            <div className="flex flex-col gap-2 px-3.5 py-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
          )}
          {list.isSuccess && bursts.length === 0 && (
            <p className="px-3.5 py-4 text-sm text-muted-foreground">
              {m.notification_empty()}
            </p>
          )}
          <NotificationSection
            title={m.notification_section_new()}
            notifications={fresh}
            onOpen={(n) => markRead.mutate({ ids: n.ids })}
          />
          <NotificationSection
            title={m.notification_section_earlier()}
            notifications={earlier}
          />
          {list.hasNextPage && (
            <div className="flex justify-center border-t p-1.5">
              {list.isFetching ? (
                <IconLoader2 className="my-1.5 size-5 animate-spin text-muted-foreground" />
              ) : (
                <LoadOlder onLoad={() => void list.fetchNextPage()} />
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Loads the next page once scrolled into view, or on click. It unmounts while
 * a page loads, so it observes afresh and loads again if still in view.
 */
function LoadOlder({ onLoad }: { onLoad: () => void }) {
  const ref = useOnInView((inView) => {
    if (inView) onLoad();
  });

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className="w-full text-muted-foreground"
      onClick={onLoad}
    >
      {m.notification_load_older()}
    </Button>
  );
}

function NotificationSection({
  title,
  notifications,
  onOpen,
}: {
  title: string;
  notifications: NotificationListItem[];
  onOpen?: (notification: NotificationListItem) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <section>
      <h5 className="px-3.5 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground">
        {title}
      </h5>
      <ul>
        {notifications.map((n) => (
          <li key={n.ids[0]} className="border-t">
            <NotificationRow notification={n} onOpen={() => onOpen?.(n)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The actor's list, linked under their profile when they have one, the same
 * place `/list/$id` would redirect to.
 */
function listLink({ actor, list }: NotificationListItem) {
  return actor.username === null
    ? linkOptions({ to: "/list/$id", params: { id: list.id } })
    : linkOptions({
        to: "/@{$username}/list/$slug",
        params: { username: actor.username, slug: list.slug },
      });
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationListItem;
  onOpen: () => void;
}) {
  const username = notification.actor.username ?? m.notification_unknown_user();
  const [first] = notification.collections;
  const single = notification.itemCount === 1 ? first : undefined;
  const { text, emphasis } = describe(notification, username, single);

  return (
    <Link
      {...listLink(notification)}
      onClick={onOpen}
      data-unread={notification.unread}
      className="relative flex gap-3 py-3 pr-8 pl-3.5 transition-colors hover:bg-accent data-[unread=true]:bg-accent/40 data-[unread=true]:hover:bg-accent"
    >
      <div className="relative h-fit shrink-0">
        <UserAvatar
          variant="square"
          username={username}
          className="size-8 text-sm"
        />
        <span className="absolute -right-1.5 -bottom-1.5 flex size-4.5 items-center justify-center rounded-full border-2 border-popover bg-blue-400 text-blue-950">
          <IconArrowsExchange className="size-2.5" stroke={3} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm wrap-anywhere text-foreground/80">
          {emphasize(text, emphasis)}
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
      {notification.unread && (
        <span className="absolute top-4.5 right-3.5 size-2 rounded-full bg-foreground" />
      )}
    </Link>
  );
}

type RowDescription = {
  text: string;
  // parts of the sentence to bold
  emphasis: string[];
};

/**
 * The row's sentence for each notification type.
 */
function describe(
  notification: NotificationListItem,
  username: string,
  single: NotificationCollection | undefined,
): RowDescription {
  const count = notification.itemCount;

  switch (notification.type) {
    case "trade_have": {
      const subject =
        single?.name ?? m.notification_trade_have_items({ count });
      return {
        text: single
          ? m.notification_trade_have_one({ username, collection: subject })
          : m.notification_trade_have_many({ username, items: subject }),
        emphasis: [username, subject],
      };
    }
    case "trade_want": {
      const subject =
        single?.name ?? m.notification_trade_want_items({ count });
      return {
        text: single
          ? m.notification_trade_want_one({ username, collection: subject })
          : m.notification_trade_want_many({ username, items: subject }),
        emphasis: [username, subject],
      };
    }
    default:
      notification.type satisfies never;
      return { text: "", emphasis: [] };
  }
}

function Thumbnails({
  collections,
  itemCount,
}: {
  collections: NotificationCollection[];
  itemCount: number;
}) {
  const shown = collections.slice(0, MAX_THUMBNAILS);
  const more = itemCount - shown.length;

  return (
    <div className="mt-1.5 flex gap-1.5">
      {shown.map((collection) => (
        <Thumbnail key={collection.slug} collection={collection} />
      ))}
      {more > 0 && (
        <span className="flex aspect-photocard w-8.5 items-center justify-center rounded-[3px] bg-secondary text-xs font-semibold text-muted-foreground">
          +{more}
        </span>
      )}
    </div>
  );
}

function Thumbnail({ collection }: { collection: NotificationCollection }) {
  return (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt={collection.name}
      decoding="async"
      className="aspect-photocard w-8.5 shrink-0 rounded-[3px] bg-secondary object-cover"
    />
  );
}

/**
 * Bold each part where the translated sentence placed it.
 */
function emphasize(text: string, parts: string[]) {
  const nodes: ReactNode[] = [];
  let rest = text;
  const ordered = parts
    .filter((part) => part !== "")
    .toSorted((a, b) => text.indexOf(a) - text.indexOf(b));
  for (const part of ordered) {
    const at = rest.indexOf(part);
    if (at === -1) continue;
    nodes.push(
      rest.slice(0, at),
      <b key={nodes.length} className="font-semibold text-foreground">
        {part}
      </b>,
    );
    rest = rest.slice(at + part.length);
  }
  nodes.push(rest);
  return nodes;
}

/**
 * Mark notifications read by id, or all of them. Optimistic: the rows and
 * badge update before the server does.
 */
function useMarkRead() {
  const queryClient = useQueryClient();
  const unreadKey = unreadNotificationsQuery.queryKey;
  const listKey = notificationsListQuery.queryKey;

  return useMutation({
    mutationFn: (data: MarkNotificationsRead) =>
      $markNotificationsRead({ data }),
    onMutate: async (data) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: unreadKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);
      const previous = {
        unread: queryClient.getQueryData(unreadKey),
        list: queryClient.getQueryData(listKey),
      };

      // every row when marking all
      const marked = "ids" in data ? new Set(data.ids) : undefined;
      const isMarked = (id: string) => marked === undefined || marked.has(id);
      const markedBursts = groupNotifications(
        previous.list?.pages.flatMap((page) => page.rows) ?? [],
      ).filter((n) => n.unread && n.ids.some(isMarked)).length;

      queryClient.setQueryData(unreadKey, (old) =>
        marked === undefined ? 0 : Math.max(0, (old ?? 0) - markedBursts),
      );
      queryClient.setQueryData(listKey, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                rows: page.rows.map((row) =>
                  isMarked(row.id) ? { ...row, unread: false } : row,
                ),
              })),
            },
      );

      return previous;
    },
    onError: (_error, _data, previous) => {
      if (previous === undefined) return;
      queryClient.setQueryData(unreadKey, previous.unread);
      queryClient.setQueryData(listKey, previous.list);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: unreadKey });
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
