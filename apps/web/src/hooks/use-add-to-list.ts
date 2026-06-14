import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { formatListError } from "@/lib/client/list-errors";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AddResult = { inserted: number };

type UseAddToListOptions = {
  list: ObjektList;
  collectionName: string;
  onDone: () => void;
};

/**
 * Shared mutation wrapper for the single "add objekt to list" flows. Handles the
 * success/already-on-list toast, list-query invalidation, and localized error
 * surface so each type-specific list item can focus on its own server-fn call.
 */
export function useAddToList(
  options: UseAddToListOptions,
  mutationFn: () => Promise<AddResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async ({ inserted }) => {
      if (inserted === 0) {
        toast.info(
          m.list_already_on_list({ collectionId: options.collectionName }),
        );
      } else {
        toast.success(
          m.toast_added_to_list({
            collectionId: options.collectionName,
            listName: options.list.name,
          }),
        );
      }
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

type UseBatchAddToListOptions = {
  list: ObjektList;
  requested: number;
  onDone?: () => void;
};

/**
 * Mutation wrapper for the batch "add objekts to list" flows. Reports an
 * added/skipped summary, invalidates the list query, and clears the selection
 * only after the server call succeeds.
 */
export function useBatchAddToList(
  options: UseBatchAddToListOptions,
  mutationFn: () => Promise<AddResult>,
) {
  const queryClient = useQueryClient();
  const reset = useObjektSelection((state) => state.reset);
  return useMutation({
    mutationFn,
    onSuccess: async ({ inserted }) => {
      const skipped = Math.max(options.requested - inserted, 0);
      if (inserted === 0) {
        toast.info(m.batch_all_on_list({ listName: options.list.name }));
      } else if (skipped > 0) {
        toast.success(
          m.batch_added_with_skipped({
            added: inserted.toString(),
            skipped: skipped.toString(),
            listName: options.list.name,
          }),
        );
      } else {
        toast.success(
          m.batch_added_to_list({
            added: inserted.toString(),
            listName: options.list.name,
          }),
        );
      }
      await queryClient.invalidateQueries(
        objektListQueryFilter(options.list.id),
      );
      reset();
      options.onDone?.();
    },
    onError: (error) => {
      toast.error(formatListError(error));
    },
  });
}
