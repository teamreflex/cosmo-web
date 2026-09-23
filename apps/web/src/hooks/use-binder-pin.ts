import { usePinsCache } from "@/hooks/use-profile-pins";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $pinBinder, $unpinBinder } from "@/lib/functions/binders";
import { pinsQuery } from "@/lib/queries/profile";
import { isBinderPin } from "@/lib/universal/binders";
import type { BinderPreview } from "@/lib/universal/binders";
import { track } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Whether a binder is pinned to the profile, read from the profile's pins.
 * Undefined until they load.
 */
export function usePinnedBinder(username: string, binderId: string) {
  const { data } = useQuery({
    ...pinsQuery(username),
    select: (pins) => pins.some(isBinderPin(binderId)),
  });
  return data;
}

/**
 * Pin or unpin one of the owner's binders, then put the pin at the front of
 * the profile's pins or take it out.
 */
export function useToggleBinderPin(binder: BinderPreview) {
  const pins = usePinsCache();

  return useMutation({
    mutationFn: async (pin: boolean) => {
      if (pin) return await $pinBinder({ data: { binderId: binder.id } });
      await $unpinBinder({ data: { binderId: binder.id } });
      return null;
    },
    onSuccess: (pinId) => {
      pins.update((current) => {
        const others = current.filter((pin) => !isBinderPin(binder.id)(pin));
        return pinId === null
          ? others
          : [{ kind: "binder", pinId, binder }, ...others];
      });

      if (pinId === null) {
        track("unpin-binder");
        toast.success(m.binder_toast_unpinned({ name: binder.name }));
      } else {
        track("pin-binder");
        toast.success(m.binder_toast_pinned({ name: binder.name }));
      }
    },
    onError: (error) => toast.error(formatError(error)),
  });
}
