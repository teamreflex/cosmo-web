import type { ProfilePin } from "@/lib/universal/binders";
import type { FullAccount } from "@/lib/universal/cosmo-accounts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/@{$username}");

/**
 * A value picked from the account whose profile is on screen, from the query
 * the profile layout's loader awaits. It throws off a profile, and re-renders
 * its caller only when the picked value changes.
 */
export function useProfileTarget<T>(select: (target: FullAccount) => T) {
  const targetAccountOptions = route.useRouteContext({
    select: (context) => context.targetAccountOptions,
  });
  const { data } = useSuspenseQuery({ ...targetAccountOptions, select });
  return data;
}

const noLocks: number[] = [];

/**
 * The token ids the profile on screen has locked. A profile without an Apollo
 * user shows none.
 */
export function useProfileLocks() {
  return useProfileTarget((target) =>
    target.user ? target.lockedObjekts : noLocks,
  );
}

/**
 * Whether the profile on screen has locked an objekt. A card re-renders only
 * when its own answer changes.
 */
export function useLockedObjekt(tokenId: number) {
  return useProfileTarget(
    (target) =>
      target.user !== undefined && target.lockedObjekts.includes(tokenId),
  );
}

const noPins: ProfilePin[] = [];

/**
 * The pins of the profile on screen, in pin order, from the query the
 * collection page's loader awaits. A profile without an Apollo user shows
 * none.
 */
export function useProfilePins() {
  const pinsOptions = route.useRouteContext({
    select: (context) => context.pinsOptions,
  });
  const hasUser = useProfileTarget((target) => target.user !== undefined);
  const { data } = useSuspenseQuery(pinsOptions);
  return hasUser ? data : noPins;
}

/**
 * Whether the profile on screen pins an objekt. A card re-renders only when
 * its own answer changes.
 */
export function usePinnedObjekt(tokenId: number) {
  const pinsOptions = route.useRouteContext({
    select: (context) => context.pinsOptions,
  });
  const hasUser = useProfileTarget((target) => target.user !== undefined);
  const { data } = useSuspenseQuery({
    ...pinsOptions,
    select: (pins) =>
      pins.some(
        (pin) => pin.kind === "objekt" && pin.objekt.objekt.tokenId === tokenId,
      ),
  });
  return hasUser && data;
}
