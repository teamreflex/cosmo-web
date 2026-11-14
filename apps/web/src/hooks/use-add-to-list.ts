import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AddResult = { inserted: number };

// an add of one collection, which the toasts name
type NamedAdd = {
  collectionName: string;
};

// an add of several objekts, which the toast counts
type CountedAdd = {
  // items actually sent to the server (transferable for have/sale, distinct slugs for regular)
  attempted: number;
  // selected objekts dropped client-side for not being transferable
  notTradable?: number;
};

type UseAddToListOptions = {
  list: ObjektList;
  onDone?: () => void;
} & (NamedAdd | CountedAdd);

/**
 * Mutation wrapper for every "add objekts to list" flow, so each caller only
 * makes its own server-fn call. It toasts the result, invalidates the list
 * query and localizes errors. A named add reports its collection as added or
 * already on the list; a counted add breaks its total down into added,
 * already listed and not tradable.
 */
export function useAddToList<TVariables = void>(
  options: UseAddToListOptions,
  mutationFn: (variables: TVariables) => Promise<AddResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async ({ inserted }) => {
      if ("collectionName" in options) {
        toastNamedAdd(options, inserted);
      } else {
        toastCountedAdd(options, inserted);
      }

      await queryClient.invalidateQueries(
        objektListQueryFilter(options.list.id),
      );
      options.onDone?.();
    },
    onError: (error) => {
      toast.error(
        formatError(
          error,
          "collectionName" in options
            ? { collectionId: options.collectionName }
            : undefined,
        ),
      );
    },
  });
}

function toastNamedAdd(
  options: { list: ObjektList } & NamedAdd,
  inserted: number,
) {
  if (inserted === 0) {
    toast.info(
      m.list_already_on_list({ collectionId: options.collectionName }),
    );
    return;
  }
  toast.success(
    m.toast_added_to_list({
      collectionId: options.collectionName,
      listName: options.list.name,
    }),
  );
}

function toastCountedAdd(
  options: { list: ObjektList } & CountedAdd,
  inserted: number,
) {
  const alreadyListed = Math.max(options.attempted - inserted, 0);
  const notTradable = options.notTradable ?? 0;

  const skips: string[] = [];
  if (alreadyListed > 0) {
    skips.push(m.batch_skip_already({ count: alreadyListed.toString() }));
  }
  if (notTradable > 0) {
    skips.push(m.batch_skip_not_tradable({ count: notTradable.toString() }));
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
    toast.info(m.batch_nothing_added({ listName: options.list.name, detail }));
  }
}
