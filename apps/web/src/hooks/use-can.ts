import { currentAccountQuery } from "@/lib/queries/core";
import { can } from "@apollo/auth";
import type { Permissions } from "@apollo/auth";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * Checks the signed-in user's staff role against a set of permissions.
 * Signed-out visitors are treated as the "user" role.
 */
export function useCan() {
  const { data } = useSuspenseQuery(currentAccountQuery);
  const role = data?.role ?? "user";

  return (permissions: Permissions) => can(role, permissions);
}
