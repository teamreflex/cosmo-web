import {
  $listNotifications,
  $unreadNotificationCount,
} from "@/lib/functions/notifications";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * Count of unread notifications for the current user — drives the header bell badge.
 */
export const unreadNotificationsQuery = queryOptions({
  queryKey: ["notifications-unread"],
  queryFn: ({ signal }) => $unreadNotificationCount({ signal }),
  refetchInterval: 60_000,
});

/**
 * The current user's notifications, newest first, a page at a time. Always
 * stale, so opening the bell refetches the loaded pages.
 */
export const notificationsListQuery = infiniteQueryOptions({
  queryKey: ["notifications", "list"],
  queryFn: ({ signal, pageParam }) =>
    $listNotifications({ signal, data: { cursor: pageParam } }),
  // SAFETY: cursor seed; widened for TanStack Query inference
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  staleTime: 0,
});
