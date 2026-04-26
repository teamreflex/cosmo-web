import { m } from "@/i18n/messages";
import { formatListError } from "@/lib/client/list-errors";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UseAddToListOptions = {
  list: ObjektList;
  collectionName: string;
  onDone: () => void;
};

/**
 * Shared mutation wrapper for the "add objekt to list" flows. Handles the
 * success toast, list-query invalidation, and localized error surface so
 * each type-specific list item can focus on its own server-fn call.
 */
export function useAddToList(
  options: UseAddToListOptions,
  mutationFn: () => Promise<boolean>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(
        m.toast_added_to_list({
          collectionId: options.collectionName,
          listName: options.list.name,
        }),
      );
      await queryClient.invalidateQueries(
        objektListQueryFilter(options.list.id),
      );
      options.onDone();
    },
    onError: (error) => {
      toast.error(
        formatListError(error, { collectionId: options.collectionName }),
      );
    },
  });
}
