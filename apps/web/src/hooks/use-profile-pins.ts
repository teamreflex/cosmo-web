import { useProfileContext } from "@/hooks/use-profile";
import { pinsQuery } from "@/lib/queries/profile";
import { isBinderPin } from "@/lib/universal/binders";
import type { ProfilePin } from "@/lib/universal/binders";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

type PinsChange = (pins: ProfilePin[]) => ProfilePin[];

/**
 * The pins query of the profile on screen, keyed by the route param as the
 * profile's loader keys it. The pin grid follows this query, so a pin change
 * made anywhere on the profile is written into it. Off a profile, or before
 * the pins have loaded, there's nothing to write to.
 */
export function usePinsCache() {
  const queryClient = useQueryClient();
  const username = useParams({
    strict: false,
    select: (params) => params.username,
  });

  function update(change: PinsChange) {
    if (username === undefined) return;
    queryClient.setQueryData(pinsQuery(username).queryKey, (pins) =>
      pins === undefined ? undefined : change(pins),
    );
  }

  /**
   * Refetch the pins after a change to how a binder looks, when it's pinned.
   * The profile never refetches its pins by itself, so they're refetched here
   * even when nothing is showing them.
   */
  function refreshBinder(binderId: string) {
    if (username === undefined) return;
    const { queryKey } = pinsQuery(username);
    if (queryClient.getQueryData(queryKey)?.some(isBinderPin(binderId))) {
      void queryClient.invalidateQueries({ queryKey, refetchType: "all" });
    }
  }

  return { update, refreshBinder };
}

/**
 * Change the profile's pins in the store the pin grid renders from, so the
 * grid moves at once, and in the pins query the store follows.
 */
export function useUpdatePins() {
  const updatePins = useProfileContext((state) => state.updatePins);
  const cache = usePinsCache();

  return (change: PinsChange) => {
    updatePins(change);
    cache.update(change);
  };
}
