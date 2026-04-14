import { m } from "@/i18n/messages";
import {
  $listNotifications,
  $markNotificationsRead,
  $unreadNotificationCount,
} from "@/lib/functions/notifications";
import type { NotificationListItem } from "@/lib/universal/notifications";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { IconArrowsExchange, IconBell } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => $unreadNotificationCount(),
    refetchInterval: 60_000,
  });

  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => $listNotifications({ data: { limit: 20, offset: 0 } }),
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => $markNotificationsRead({ data: {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "list"],
      });
    },
  });

  const count = unread.data ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.notification_bell_label()}
          className="relative"
        >
          <IconBell />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 gap-0">
        <header className="flex items-center justify-between border-b p-3">
          <h4 className="text-sm font-semibold">
            {m.notification_bell_label()}
          </h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              {m.notification_mark_all_read()}
            </Button>
          )}
        </header>
        <ScrollArea className="max-h-96">
          {list.isPending && <p className="p-3 text-sm">…</p>}
          {list.data && list.data.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              {m.notification_empty()}
            </p>
          )}
          <ul>
            {list.data?.map((n) => (
              <li
                key={n.id}
                className="border-b p-3 text-sm last:border-b-0 data-[unread=true]:bg-accent/30"
                data-unread={n.readAt === null}
              >
                <NotificationRow notification={n} />
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
}: {
  notification: NotificationListItem;
}) {
  switch (notification.type) {
    case "list_match":
      return <ListMatchRow notification={notification} />;
    default:
      notification.type satisfies never;
      return null;
  }
}

function ListMatchRow({
  notification,
}: {
  notification: NotificationListItem;
}) {
  const payload: ListMatchPayload = notification.payload;
  const username = notification.sourceUsername ?? m.notification_unknown_user();
  const text =
    payload.direction === "they_added_have"
      ? m.notification_list_match_have({
          username,
          collection: payload.collectionId,
        })
      : m.notification_list_match_want({
          username,
          collection: payload.collectionId,
        });

  return (
    <Link
      to="/list/$id"
      params={{ id: payload.sourceListId }}
      className="flex items-start gap-2 hover:underline"
    >
      <IconArrowsExchange className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </Link>
  );
}
