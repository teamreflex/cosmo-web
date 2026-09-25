import { usePinsCache } from "@/hooks/use-profile-pins";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $addToBinder } from "@/lib/functions/binders";
import {
  binderMenuQuery,
  binderQuery,
  binderShelfQuery,
} from "@/lib/queries/binders";
import type { BinderMenuItem } from "@/lib/universal/binders";
import { track } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

type Options = {
  collectionName: string;
  tokenId: number;
  onDone: () => void;
};

type TargetBinder = Pick<BinderMenuItem, "id" | "userId" | "slug" | "name">;

/**
 * Add one objekt to a binder's first empty pocket. The toast names the page
 * it landed on and opens the binder's editor.
 */
export function useAddToBinder({ collectionName, tokenId, onDone }: Options) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pins = usePinsCache();
  // the profile's route param, as the editor link elsewhere on the profile uses
  const username = useParams({
    strict: false,
    select: (params) => params.username,
  });

  return useMutation({
    mutationFn: (binder: TargetBinder) =>
      $addToBinder({ data: { binderId: binder.id, tokenId } }),
    onSuccess: async (placement, binder) => {
      const page = placement.page + 1;
      const action =
        username === undefined
          ? undefined
          : {
              label: m.binder_add_open(),
              onClick: () =>
                void navigate({
                  to: "/@{$username}/binder/$slug",
                  params: { username, slug: binder.slug },
                  search: { page },
                }),
            };

      queryClient.setQueryData(binderMenuQuery(tokenId).queryKey, (items) =>
        items?.map((item) =>
          item.id === binder.id
            ? {
                ...item,
                holding: { page: placement.page, slot: placement.slot },
              }
            : item,
        ),
      );
      onDone();

      if (placement.kind === "already") {
        toast.info(
          m.binder_add_already({
            collectionId: collectionName,
            name: binder.name,
            page,
          }),
          { action },
        );
        return;
      }

      track("add-to-binder");
      toast.success(m.binder_add_added({ name: binder.name, page }), {
        action,
      });

      // a pinned binder's cover draws page 1 and counts the pages
      if (placement.kind === "new-page" || placement.page === 0) {
        pins.refreshBinder(binder.id);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: binderMenuQuery(tokenId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: binderShelfQuery(binder.userId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: binderQuery(binder.userId, binder.slug).queryKey,
        }),
      ]);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
}
