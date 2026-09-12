import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { $reorderPins } from "@/lib/functions/collection";
import { track } from "@/lib/utils";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

const routeApi = getRouteApi("/@{$username}/");

export type PinMove = { tokenId: number; overTokenId: number };

/**
 * Optimistically reorder the viewer's own pins and persist the new order.
 * Writes the store (the inline grid renders from it) and the pins query cache
 * shared with the loader via route context, rolling both back on failure.
 */
export function usePinReorder() {
  const reorderPins = useProfileContext((c) => c.reorderPins);
  const pins = useProfileContext((c) => c.pins);
  const queryClient = useQueryClient();
  const { pinsOptions } = routeApi.useRouteContext();

  const mutation = useMutation({
    mutationFn: async (move: PinMove) => {
      // false means neither pin matched server state, so roll back
      if (!(await $reorderPins({ data: move }))) {
        throw new Error("pin_not_found");
      }
    },
    onMutate: ({ tokenId, overTokenId }) => {
      const previous = pins;
      const reordered = arrayMove(
        previous,
        previous.findIndex((p) => Number(p.tokenId) === tokenId),
        previous.findIndex((p) => Number(p.tokenId) === overTokenId),
      );
      reorderPins(reordered);
      queryClient.setQueryData(pinsOptions.queryKey, reordered);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        reorderPins(ctx.previous);
        queryClient.setQueryData(pinsOptions.queryKey, ctx.previous);
      }
      toast.error(m.toast_pin_reorder_error());
    },
    onSuccess: () => track("reorder-pins"),
  });

  return useCallback((move: PinMove) => mutation.mutate(move), [mutation]);
}
