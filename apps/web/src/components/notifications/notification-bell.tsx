import { m } from "@/i18n/messages";
import {
  $listNotifications,
  $markNotificationsRead,
  $unreadNotificationCount,
} from "@/lib/functions/notifications";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { IconBell } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      <PopoverContent align="end" className="w-80 p-0">
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
                <NotificationRow payload={n.payload as ListMatchPayload} />
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ payload }: { payload: ListMatchPayload }) {
  const isHave = payload.direction === "they_added_have";
  const text = isHave
    ? m.notification_list_match_have({ collection: payload.collectionId })
    : m.notification_list_match_want({ collection: payload.collectionId });

  return (
    <a href={`/list/${payload.sourceListId}`} className="block hover:underline">
      {text}
    </a>
  );
}
