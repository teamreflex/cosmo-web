import { m } from "@/i18n/messages";
import { lazyWithPreload } from "@/lib/lazy";
import { unreadNotificationsQuery } from "@/lib/queries/notifications";
import { IconBell, IconRefresh } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import LazyFallback from "../lazy-fallback";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const NotificationPanel = lazyWithPreload(() => import("./notification-panel"));

export default function NotificationBell() {
  // remembering where the popover was opened closes it on any navigation
  const pathname = useLocation({ select: (location) => location.pathname });
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const queryClient = useQueryClient();

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
        }
      }}
    >
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
        onPointerEnter={NotificationPanel.preload}
        onFocus={NotificationPanel.preload}
      >
        <IconBell aria-hidden className="size-6" />
        <ErrorBoundary fallback={<BellLabel count={0} />}>
          <Suspense fallback={<BellLabel count={0} />}>
            <UnreadLabel />
          </Suspense>
        </ErrorBoundary>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 max-w-[calc(100vw-1rem)] gap-0 p-0"
      >
        <ErrorBoundary fallback={<PanelLoadError />}>
          <Suspense fallback={<LazyFallback />}>
            <NotificationPanel onClose={() => setOpenedOn(null)} />
          </Suspense>
        </ErrorBoundary>
      </PopoverContent>
    </Popover>
  );
}

function UnreadLabel() {
  const { data: count } = useSuspenseQuery(unreadNotificationsQuery);
  return <BellLabel count={count} />;
}

/**
 * The bell's name, with its unread count, and the count as a badge.
 */
function BellLabel({ count }: { count: number }) {
  return count > 0 ? (
    <>
      <span className="sr-only">
        {m.notification_bell_label_unread({ count })}
      </span>
      <span
        aria-hidden
        className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cosmo px-1 text-xs font-semibold text-white tabular-nums ring-2 ring-background"
      >
        {count > 99 ? "99+" : count}
      </span>
    </>
  ) : (
    <span className="sr-only">{m.notification_bell_label()}</span>
  );
}

/**
 * The panel's chunk failed to load. `React.lazy()` keeps the failure, so only a reload fetches it again.
 */
function PanelLoadError() {
  return (
    <div className="flex flex-col items-center gap-2 px-3.5 py-6">
      <p className="text-sm text-muted-foreground">{m.notification_error()}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
      >
        <IconRefresh /> {m.error_try_again()}
      </Button>
    </div>
  );
}
