import { formatError } from "@/lib/client/errors";
import {
  $addBinderPage,
  $clearPocket,
  $placeObjekt,
  $removeLastBinderPage,
  $swapPockets,
  $updateBinder,
} from "@/lib/functions/binders";
import { binderQuery, binderShelfQuery } from "@/lib/queries/binders";
import {
  withClearedPocket,
  withoutLastPage,
  withPlacedObjekt,
  withSwappedPockets,
} from "@/lib/universal/binders";
import type {
  BinderDetail,
  BinderLayout,
  PocketPosition,
} from "@/lib/universal/binders";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

type Options = {
  binderId: string;
  userId: string;
  slug: string;
};

/**
 * Every editor change as its own optimistic mutation on the binder's query
 * cache, with no save step.
 */
export function useBinderMutations(options: Options) {
  const { binderId } = options;

  const place = useBinderMutation(
    options,
    ({ objekt, ...pocket }: PocketPosition & { objekt: CosmoObjekt }) =>
      $placeObjekt({
        data: { binderId, ...pocket, tokenId: Number(objekt.tokenId) },
      }),
    (binder, { objekt, ...pocket }) => withPlacedObjekt(binder, pocket, objekt),
  );

  const clear = useBinderMutation(
    options,
    (pocket: PocketPosition) => $clearPocket({ data: { binderId, ...pocket } }),
    withClearedPocket,
  );

  const swap = useBinderMutation(
    options,
    ({ from, to }: { from: PocketPosition; to: PocketPosition }) =>
      $swapPockets({ data: { binderId, from, to } }),
    (binder, { from, to }) => withSwappedPockets(binder, from, to),
  );

  const addPage = useBinderMutation(
    options,
    () => $addBinderPage({ data: { binderId } }),
    (binder) => ({ ...binder, pageCount: binder.pageCount + 1 }),
  );

  const removeLastPage = useBinderMutation(
    options,
    () => $removeLastBinderPage({ data: { binderId } }),
    withoutLastPage,
  );

  const setCover = useBinderMutation(
    options,
    (coverTokenId: number | null) =>
      $updateBinder({ data: { binderId, coverTokenId } }),
    (binder, coverTokenId) => ({ ...binder, coverTokenId }),
  );

  const setLayout = useBinderMutation(
    options,
    (layout: BinderLayout) => $updateBinder({ data: { binderId, layout } }),
    (binder, layout) => ({ ...binder, layout }),
  );

  const pending =
    useIsMutating({ mutationKey: binderMutationKey(binderId) }) > 0;

  return {
    place: place.mutate,
    clear: clear.mutate,
    swap: swap.mutate,
    addPage: () => addPage.mutate(undefined),
    removeLastPage: () => removeLastPage.mutate(undefined),
    setCover: setCover.mutate,
    setLayout: setLayout.mutate,
    pending,
  };
}

const binderMutationKey = (binderId: string) => ["binder-edit", binderId];

/**
 * One optimistic binder change. Every change shares a scope, so they reach the
 * server in the order they were made. A failure rolls the cache back, shows
 * the error and refetches, since later changes may sit on top of the snapshot.
 */
function useBinderMutation<TData, TVariables>(
  { binderId, userId, slug }: Options,
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimistic: (binder: BinderDetail, variables: TVariables) => BinderDetail,
) {
  const queryClient = useQueryClient();
  const binderKey = binderQuery(userId, slug).queryKey;

  return useMutation({
    mutationKey: binderMutationKey(binderId),
    scope: { id: `binder:${binderId}` },
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: binderKey });
      const previous = queryClient.getQueryData(binderKey);
      queryClient.setQueryData(binderKey, (binder) =>
        binder === undefined || binder === null
          ? binder
          : optimistic(binder, variables),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context !== undefined) {
        queryClient.setQueryData(binderKey, context.previous);
      }
      toast.error(formatError(error));
      void queryClient.invalidateQueries({ queryKey: binderKey });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: binderShelfQuery(userId).queryKey,
      }),
  });
}
