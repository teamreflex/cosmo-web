import { currentAccountQuery } from "@/lib/queries/core";
import { can, marketAccess } from "@apollo/auth";
import type { Permissions, Role } from "@apollo/auth";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { notFound, rootRouteId } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";

/**
 * Checks the signed-in user's staff role against a set of permissions.
 * Signed-out visitors are treated as the "user" role.
 */
export function useHasPermission() {
  const { data } = useSuspenseQuery(currentAccountQuery);
  const role = data?.role ?? "user";

  return (permissions: Permissions) => can(role, permissions);
}

/**
 * Called from a page's `beforeLoad` with the permissions that open it, any
 * one of which is enough, so its loader never runs for a role without them.
 * It throws a not-found rather than an error because SSR answers route
 * errors with a 500. The nearest `notFoundComponent` renders it, such as an
 * admin page's `AdminNoAccess`, unless `notFoundOptions` names a route.
 */
export function requirePermission(
  role: Role,
  anyOf: Permissions[],
  notFoundOptions?: NotFoundError,
) {
  if (!anyOf.some((permissions) => can(role, permissions))) {
    throw notFound(notFoundOptions);
  }
}

/**
 * Gates a trade system page, counting signed-out visitors as the "user"
 * role. Without access the site's 404 shows rather than the page's own
 * not-found state.
 */
export async function requireMarketAccess(queryClient: QueryClient) {
  const account = await queryClient.query({
    ...currentAccountQuery,
    staleTime: "static",
  });
  requirePermission(account?.role ?? "user", [marketAccess], {
    routeId: rootRouteId,
  });
}
