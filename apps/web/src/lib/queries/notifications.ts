import {
  $listNotifications,
  $unreadNotificationCount,
} from "@/lib/functions/notifications";
import { queryOptions } from "@tanstack/react-query";

/**
 * Count of unread notifications for the current user — drives the header bell badge.
 */
export const unreadNotificationsQuery = queryOptions({
  queryKey: ["notifications-unread"],
  queryFn: ({ signal }) => $unreadNotificationCount({ signal }),
  refetchInterval: 60_000,
});

/**
 * Paginated list of the current user's notifications, newest first.
 */
export const notificationsListQuery = (params: {
  limit: number;
  offset: number;
}) =>
  queryOptions({
    queryKey: ["notifications", "list", params],
    queryFn: ({ signal }) => $listNotifications({ signal, data: params }),
  });
