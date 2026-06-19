import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Returns false during SSR and the first client render, then true once hydrated.
// Lets components gate client-only output without a setState-in-effect.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
