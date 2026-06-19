import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
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
      toast.error(formatError(error, { collectionId: options.collectionName }));
    },
  });
}

type UseBatchAddToListOptions = {
  list: ObjektList;
  // items actually sent to the server (transferable for have/sale, distinct slugs for regular)
  attempted: number;
  // selected objekts dropped client-side for not being transferable
  notTradable?: number;
  onDone?: () => void;
};

/**
 * Mutation wrapper for the batch "add objekts to list" flows. Reports a summary
 * that breaks down the result into added / already-listed / not-tradable,
 * invalidates the list query, and clears the selection after the server call.
 */
export function useBatchAddToList<TVariables = void>(
  options: UseBatchAddToListOptions,
  mutationFn: (variables: TVariables) => Promise<AddResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async ({ inserted }) => {
      const alreadyListed = Math.max(options.attempted - inserted, 0);
      const notTradable = options.notTradable ?? 0;

      const skips: string[] = [];
      if (alreadyListed > 0) {
        skips.push(m.batch_skip_already({ count: alreadyListed.toString() }));
      }
      if (notTradable > 0) {
        skips.push(
          m.batch_skip_not_tradable({ count: notTradable.toString() }),
        );
      }
      const detail = skips.join(", ");

      if (inserted > 0) {
        toast.success(
          detail
            ? m.batch_added_with_detail({
                added: inserted.toString(),
                listName: options.list.name,
                detail,
              })
            : m.batch_added_to_list({
                added: inserted.toString(),
                listName: options.list.name,
              }),
        );
      } else {
        // nothing inserted; the guard upstream means `detail` is always set
        toast.info(
          m.batch_nothing_added({ listName: options.list.name, detail }),
        );
      }

      await queryClient.invalidateQueries(
        objektListQueryFilter(options.list.id),
      );
      options.onDone?.();
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
}
