import { m } from "@/i18n/messages";
import { $markNotificationsRead } from "@/lib/functions/notifications";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import type { NotificationListItem } from "@/lib/universal/notifications";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { IconArrowsExchange, IconBell } from "@tabler/icons-react";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useQuery(unreadNotificationsQuery);
  const list = useQuery({
    ...notificationsListQuery({ limit: 20, offset: 0 }),
    enabled: open,
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
          <IconBell className="size-6" />
          {count > 0 && (
            <div className="flex items-center justify-center absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px] bg-red-600/25 text-red-600">
              {count > 99 ? "99+" : count}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 gap-0">
        <header className="flex items-center justify-between border-b h-12 px-2">
          <h4 className="text-sm font-semibold">
            {m.notification_bell_label()}
          </h4>

          {count > 0 && <MarkAllReadButton />}
        </header>

        <ScrollArea className="max-h-96">
          {list.isPending && <p className="p-2 text-sm">…</p>}
          {list.data && list.data.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">
              {m.notification_empty()}
            </p>
          )}
          <ul>
            {list.data?.map((n) => (
              <li
                key={n.id}
                className="border-b p-2 text-sm last:border-b-0 data-[unread=true]:bg-accent/30"
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

function MarkAllReadButton() {
  const queryClient = useQueryClient();
  const snapshot = useRef<{
    unread: number | undefined;
    list: Array<[QueryKey, NotificationListItem[] | undefined]>;
  } | null>(null);

  const markAll = useMutation({
    mutationFn: () => $markNotificationsRead({ data: {} }),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: unreadNotificationsQuery.queryKey,
      });
      await queryClient.cancelQueries({
        queryKey: ["notifications", "list"],
      });

      snapshot.current = {
        unread: queryClient.getQueryData<number>(
          unreadNotificationsQuery.queryKey,
        ),
        list: queryClient.getQueriesData<NotificationListItem[]>({
          queryKey: ["notifications", "list"],
        }),
      };

      queryClient.setQueryData<number>(unreadNotificationsQuery.queryKey, 0);

      const now = new Date().toISOString();
      queryClient.setQueriesData<NotificationListItem[]>(
        { queryKey: ["notifications", "list"] },
        (old) =>
          old?.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)),
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

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => markAll.mutate()}
      disabled={markAll.isPending}
    >
      {m.notification_mark_all_read()}
    </Button>
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
