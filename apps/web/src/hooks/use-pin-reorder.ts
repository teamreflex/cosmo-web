import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { $reorderPins } from "@/lib/functions/collection";
import { pinsQuery } from "@/lib/queries/profile";
import { track } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

const routeApi = getRouteApi("/@{$username}/");

/**
 * Optimistically reorder the viewer's own pins and persist the new order.
 * Writes the store (the inline grid renders from it) and the pins query cache
 * keyed by the route `$username` param, rolling both back on failure.
 */
export function usePinReorder() {
  const reorderPins = useProfileContext((c) => c.reorderPins);
  const pins = useProfileContext((c) => c.pins);
  const queryClient = useQueryClient();
  // the loader keys the pins query by the route param, which differs from the
  // resolved cosmo username when a profile is opened by address
  const { username } = routeApi.useParams();

  const mutation = useMutation({
    mutationFn: (tokenIds: number[]) => $reorderPins({ data: { tokenIds } }),
    onMutate: (tokenIds) => {
      const previous = pins;
      const byId = new Map(previous.map((p) => [Number(p.tokenId), p]));
      const reordered = tokenIds
        .map((id) => byId.get(id))
        .filter((p): p is CosmoObjekt => !!p);
      reorderPins(reordered);
      queryClient.setQueryData(pinsQuery(username).queryKey, reordered);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        reorderPins(ctx.previous);
        queryClient.setQueryData(pinsQuery(username).queryKey, ctx.previous);
      }
      toast.error(m.toast_pin_reorder_error());
    },
    onSuccess: () => track("reorder-pins"),
  });

  return useCallback((ids: number[]) => mutation.mutate(ids), [mutation]);
}
