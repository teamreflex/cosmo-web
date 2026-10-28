import { useProfileContext } from "@/hooks/use-profile";
import { useUpdatePins } from "@/hooks/use-profile-pins";
import { m } from "@/i18n/messages";
import { $reorderPins } from "@/lib/functions/collection";
import { track } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

export type PinMove = { pinId: number; overPinId: number };

/**
 * Optimistically reorder the viewer's own pins and persist the new order.
 * Writes the store (the inline grid renders from it) and the pins query cache
 * the store follows, rolling both back on failure.
 */
export function usePinReorder() {
  const pins = useProfileContext((c) => c.pins);
  const updatePins = useUpdatePins();

  const mutation = useMutation({
    mutationFn: async (move: PinMove) => {
      // false means neither pin matched server state, so roll back
      if (!(await $reorderPins({ data: move }))) {
        throw new Error("pin_not_found");
      }
    },
    onMutate: ({ pinId, overPinId }) => {
      const previous = pins;
      const reordered = arrayMove(
        previous,
        previous.findIndex((p) => p.pinId === pinId),
        previous.findIndex((p) => p.pinId === overPinId),
      );
      updatePins(() => reordered);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) updatePins(() => ctx.previous);
      toast.error(m.toast_pin_reorder_error());
    },
    onSuccess: () => track("reorder-pins"),
  });

  return useCallback((move: PinMove) => mutation.mutate(move), [mutation]);
}

/**
 * `arrayMove()` from `@dnd-kit/sortable`, copied so the profile route doesn't pull in dnd-kit for every viewer.
 */
function arrayMove<T>(array: T[], from: number, to: number) {
  const next = array.slice();
  next.splice(to < 0 ? next.length + to : to, 0, ...next.splice(from, 1));
  return next;
}
