import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import {
  $unwatchCollection,
  $watchCollection,
} from "@/lib/functions/watchlist";
import {
  watchedSlugsQuery,
  watchlistQueryFilter,
} from "@/lib/queries/watchlist";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

export type WatchCollection = {
  watching: boolean;
  toggle: () => void;
  isPending: boolean;
};

/**
 * Whether the viewer watches a collection, and a toggle that updates every
 * watch control at once before the server confirms.
 */
export function useWatchCollection(
  collection: Pick<Objekt.Collection, "slug" | "collectionId">,
): WatchCollection {
  const queryClient = useQueryClient();
  const { data: watching } = useSuspenseQuery({
    ...watchedSlugsQuery,
    select: (slugs) => slugs.includes(collection.slug),
  });

  const mutation = useMutation({
    mutationFn: (watch: boolean) =>
      (watch ? $watchCollection : $unwatchCollection)({
        data: { slug: collection.slug },
      }),
    onMutate: async (watch) => {
      await queryClient.cancelQueries(watchedSlugsQuery);
      const previous = queryClient.getQueryData(watchedSlugsQuery.queryKey);
      queryClient.setQueryData(watchedSlugsQuery.queryKey, (slugs = []) =>
        watch
          ? [collection.slug, ...slugs]
          : slugs.filter((slug) => slug !== collection.slug),
      );
      return { previous };
    },
    onSuccess: (_, watch) => {
      if (watch) {
        toast.success(
          m.watch_toast_added({ collection: collection.collectionId }),
        );
      }
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(watchedSlugsQuery.queryKey, context?.previous);
      toast.error(
        formatError(error, { collectionId: collection.collectionId }),
      );
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries(watchedSlugsQuery),
        queryClient.invalidateQueries(watchlistQueryFilter),
      ]);
    },
  });

  return {
    watching,
    toggle: () => mutation.mutate(!watching),
    isPending: mutation.isPending,
  };
}
