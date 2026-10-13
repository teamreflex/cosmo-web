import { useMarkNotificationsRead } from "@/hooks/use-mark-notifications-read";
import { m } from "@/i18n/messages";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import { tradesNeedingYouQuery } from "@/lib/queries/trades";
import {
  groupNotifications,
  type NotificationListItem,
} from "@/lib/universal/notifications";
import { IconBell, IconChecks, IconLoader2 } from "@tabler/icons-react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useOnInView } from "react-intersection-observer";
import { Button, buttonVariants } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import ListMatchRow from "./list-match-row";
import TradeRow from "./trade-row";

export default function NotificationBell() {
  // remembering where the popover was opened closes it on any navigation
  const pathname = useLocation({ select: (location) => location.pathname });
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const queryClient = useQueryClient();
  const unread = useQuery(unreadNotificationsQuery);
  const needsYou = useQuery(tradesNeedingYouQuery).data ?? 0;
  const list = useInfiniteQuery({ ...notificationsListQuery, enabled: open });
  const markRead = useMarkNotificationsRead();

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
        // the list refetches on open, so the badge and count catch up with it
        if (open) {
          void queryClient.invalidateQueries({
            queryKey: unreadNotificationsQuery.queryKey,
          });
          void queryClient.invalidateQueries({
            queryKey: tradesNeedingYouQuery.queryKey,
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
        <header className="flex h-12 items-center gap-1 border-b pr-2 pl-3.5">
          <h4 className="mr-auto text-sm font-semibold">
            {m.notification_bell_label()}
          </h4>

          <Link
            to="/market/trades"
            // already on My trades, the path doesn't change to close it
            onClick={() => setOpenedOn(null)}
            aria-label={
              needsYou > 0
                ? m.my_trades_label_count({ count: needsYou })
                : m.my_trades_title()
            }
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {m.my_trades_title()}
            {needsYou > 0 && (
              <span className="font-mono text-cosmo tabular-nums dark:text-cosmo-text">
                · {needsYou}
              </span>
            )}
          </Link>

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

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationListItem;
  onOpen: () => void;
}) {
  return notification.kind === "list_match" ? (
    <ListMatchRow notification={notification} onOpen={onOpen} />
  ) : (
    <TradeRow notification={notification} onOpen={onOpen} />
  );
}
