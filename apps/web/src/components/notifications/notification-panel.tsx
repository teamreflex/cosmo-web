import { useHasPermission } from "@/hooks/use-has-permission";
import { useMarkNotificationsRead } from "@/hooks/use-mark-notifications-read";
import { m } from "@/i18n/messages";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import {
  groupNotifications,
  type NotificationListItem,
} from "@/lib/universal/notifications";
import { marketAccess } from "@apollo/auth";
import { IconChecks, IconLoader2, IconRefresh } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useOnInView } from "react-intersection-observer";
import { Button, buttonVariants } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import ListMatchRow from "./list-match-row";
import TradeRow from "./trade-row";

type Props = {
  /**
   * Closes the popover, for a link to the page that's already open.
   */
  onClose: () => void;
};

/**
 * The open notification popover's body, loaded with the popover.
 */
export default function NotificationPanel({ onClose }: Props) {
  const hasPermission = useHasPermission();

  return (
    <>
      <header className="flex h-12 items-center gap-1 border-b pr-2 pl-3.5">
        <h4 className="mr-auto text-sm font-semibold">
          {m.notification_bell_label()}
        </h4>

        {hasPermission(marketAccess) && (
          <Link
            to="/market/trades"
            // already on My trades, the path doesn't change to close it
            onClick={onClose}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {m.my_trades_title()}
          </Link>
        )}

        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <MarkAllRead />
          </Suspense>
        </ErrorBoundary>
      </header>

      {/* a flex column lets the viewport shrink to the max height and scroll */}
      <ScrollArea className="flex max-h-[28rem] flex-col">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="flex flex-col items-center gap-2 px-3.5 py-6">
                  <p className="text-sm text-muted-foreground">
                    {m.notification_error()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetErrorBoundary}
                  >
                    <IconRefresh /> {m.common_retry()}
                  </Button>
                </div>
              )}
            >
              <Suspense
                fallback={
                  <div className="flex flex-col gap-2 px-3.5 py-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-md" />
                    ))}
                  </div>
                }
              >
                <NotificationList />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ScrollArea>
    </>
  );
}

/**
 * The loaded notifications, unread ones first. The list mounts with the
 * open popover and refetches its loaded pages each time.
 */
function NotificationList() {
  const list = useSuspenseInfiniteQuery(notificationsListQuery);
  const markRead = useMarkNotificationsRead();
  const bursts = groupNotifications(
    list.data.pages.flatMap((page) => page.rows),
  );

  return (
    <>
      {bursts.length === 0 && (
        <p className="px-3.5 py-4 text-sm text-muted-foreground">
          {m.notification_empty()}
        </p>
      )}
      <NotificationSection
        title={m.notification_section_new()}
        notifications={bursts.filter((n) => n.unread)}
        onOpen={(n) => markRead.mutate({ ids: n.ids })}
      />
      <NotificationSection
        title={m.notification_section_earlier()}
        notifications={bursts.filter((n) => !n.unread)}
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
    </>
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

// shown while anything is unread
function MarkAllRead() {
  const { data: count } = useSuspenseQuery(unreadNotificationsQuery);
  const markRead = useMarkNotificationsRead();

  return (
    count > 0 && (
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
    )
  );
}
