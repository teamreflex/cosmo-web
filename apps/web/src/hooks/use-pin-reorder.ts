import { useProfilePins } from "@/hooks/use-profile";
import { usePinsCache } from "@/hooks/use-profile-pins";
import { m } from "@/i18n/messages";
import { $reorderPins } from "@/lib/functions/collection";
import type { ProfilePin } from "@/lib/universal/binders";
import { track } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type PinMove = { pinId: number; overPinId: number };

/**
 * The profile's pins for a grid its owner can reorder by dragging, and the
 * handler for a drop. A drop writes the new order to the pins query at once
 * and persists it, and a failed one puts the previous order back.
 */
export function usePinReorder() {
  const queried = useProfilePins();
  const cache = usePinsCache();
  /**
   * A dropped order and the query's array it was dropped over. The drop
   * animation measures the cells in the commit that ends the drag, and the
   * query's subscribers only hear of a cache write a task later. Setting
   * this state re-renders the grid in that commit, with the dropped order
   * standing in for as long as the query still hands back the old array.
   */
  const [dropped, setDropped] = useState<{
    over: ProfilePin[];
    order: ProfilePin[];
  } | null>(null);
  const pins = dropped?.over === queried ? dropped.order : queried;

  const mutation = useMutation({
    mutationFn: async (move: PinMove) => {
      // false means neither pin matched server state, so roll back
      if (!(await $reorderPins({ data: move }))) {
        throw new Error("pin_not_found");
      }
    },
    onMutate: ({ pinId, overPinId }) => {
      const reordered = arrayMove(
        pins,
        pins.findIndex((p) => p.pinId === pinId),
        pins.findIndex((p) => p.pinId === overPinId),
      );
      setDropped({ over: queried, order: reordered });
      cache.update(() => reordered);
      return { previous: pins, reordered };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) cache.update(() => ctx.previous);
      toast.error(m.toast_pin_reorder_error());
    },
    onSuccess: () => track("reorder-pins"),
    // a later drop's order stays until its own reorder settles
    onSettled: (_d, _e, _v, ctx) =>
      setDropped((current) =>
        current?.order === ctx?.reordered ? null : current,
      ),
  });

  return {
    pins,
    onReorderPins: useCallback(
      (move: PinMove) => mutation.mutate(move),
      [mutation],
    ),
  };
}

/**
 * `arrayMove()` from `@dnd-kit/sortable`, copied so the profile route doesn't pull in dnd-kit for every viewer.
 */
function arrayMove<T>(array: T[], from: number, to: number) {
  const next = array.slice();
  next.splice(to < 0 ? next.length + to : to, 0, ...next.splice(from, 1));
  return next;
}
