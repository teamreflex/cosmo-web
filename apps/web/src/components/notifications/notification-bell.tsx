import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { $markNotificationsRead } from "@/lib/functions/notifications";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import type {
  NotificationCollection,
  NotificationListItem,
} from "@/lib/universal/notifications";
import { IconArrowsExchange, IconBell, IconChecks } from "@tabler/icons-react";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, linkOptions, useLocation } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";
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
  const unread = useQuery(unreadNotificationsQuery);
  const list = useQuery({
    ...notificationsListQuery({ limit: 20, offset: 0 }),
    enabled: open,
  });
  const markRead = useMarkRead();

  const count = unread.data ?? 0;
  const fresh = list.data?.filter((n) => n.unread) ?? [];
  const earlier = list.data?.filter((n) => !n.unread) ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={(open) => setOpenedOn(open ? pathname : null)}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.notification_bell_label()}
            className="relative"
          />
        }
      >
        <IconBell className="size-6" />
        {count > 0 && (
          <div className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cosmo px-1 text-xs font-semibold text-white tabular-nums ring-2 ring-background">
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
              onClick={() => markRead.mutate(undefined)}
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
          {list.data && list.data.length === 0 && (
            <p className="px-3.5 py-4 text-sm text-muted-foreground">
              {m.notification_empty()}
            </p>
          )}
          <NotificationSection
            title={m.notification_section_new()}
            notifications={fresh}
            onOpen={(n) => markRead.mutate(n.ids)}
          />
          <NotificationSection
            title={m.notification_section_earlier()}
            notifications={earlier}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
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
        <p className="text-sm text-foreground/80">
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
 * Mark bursts read by their notification ids, or everything when called
 * without ids. Optimistic: the rows and badge update before the server does.
 */
function useMarkRead() {
  const queryClient = useQueryClient();
  const snapshot = useRef<{
    unread: number | undefined;
    list: Array<[QueryKey, NotificationListItem[] | undefined]>;
  } | null>(null);

  return useMutation({
    mutationFn: (ids: string[] | undefined) =>
      $markNotificationsRead({ data: { ids } }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({
        queryKey: unreadNotificationsQuery.queryKey,
      });
      await queryClient.cancelQueries({
        queryKey: ["notifications", "list"],
      });

      const list = queryClient.getQueriesData<NotificationListItem[]>({
        queryKey: ["notifications", "list"],
      });
      snapshot.current = {
        unread: queryClient.getQueryData<number>(
          unreadNotificationsQuery.queryKey,
        ),
        list,
      };

      const marked = new Set(ids);
      const matches = (n: NotificationListItem) =>
        n.unread && (ids === undefined || n.ids.some((id) => marked.has(id)));
      const markedBursts = (list[0]?.[1] ?? []).filter(matches).length;

      queryClient.setQueryData<number>(
        unreadNotificationsQuery.queryKey,
        (old) =>
          ids === undefined ? 0 : Math.max(0, (old ?? 0) - markedBursts),
      );
      queryClient.setQueriesData<NotificationListItem[]>(
        { queryKey: ["notifications", "list"] },
        (old) => old?.map((n) => (matches(n) ? { ...n, unread: false } : n)),
      );
    },
    onError: () => {
      const prev = snapshot.current;
      if (!prev) return;
      queryClient.setQueryData(unreadNotificationsQuery.queryKey, prev.unread);
      for (const [key, data] of prev.list) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: unreadNotificationsQuery.queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "list"],
      });
    },
  });
}
