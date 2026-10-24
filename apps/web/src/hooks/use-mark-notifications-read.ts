import { $markNotificationsRead } from "@/lib/functions/notifications";
import {
  notificationsListQuery,
  unreadNotificationsQuery,
} from "@/lib/queries/notifications";
import type { MarkNotificationsRead } from "@/lib/universal/schema/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mark notifications read by id, or all of them. Optimistic: the rows and
 * badge update before the server does.
 */
export function useMarkNotificationsRead() {
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
      const markedRows =
        previous.list?.pages
          .flatMap((page) => page.rows)
          .filter((row) => row.unread && isMarked(row.id)).length ?? 0;

      queryClient.setQueryData(unreadKey, (old) =>
        marked === undefined ? 0 : Math.max(0, (old ?? 0) - markedRows),
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
