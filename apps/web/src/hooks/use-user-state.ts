import { currentAccountQuery } from "@/lib/queries/core";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * The viewer's user and linked COSMO account, both undefined when signed out.
 * It suspends unless the route's loader awaited `currentAccountQuery`, and
 * re-renders its caller only when one of the two changes.
 */
export function useUserState() {
  const { data } = useSuspenseQuery({
    ...currentAccountQuery,
    select: (account) => ({ user: account?.user, cosmo: account?.cosmo }),
  });
  return data;
}

/**
 * The viewer's objekt lists, empty when signed out. It suspends and
 * re-renders by the same rules as `useUserState()`.
 */
export function useObjektLists() {
  const { data } = useSuspenseQuery({
    ...currentAccountQuery,
    select: (account) => account?.objektLists ?? [],
  });
  return data;
}
