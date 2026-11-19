import { currentAccountQuery } from "@/lib/queries/core";
import { can } from "@apollo/auth";
import type { Permissions, Role } from "@apollo/auth";
import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

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
 * admin page's `AdminNoAccess`.
 */
export function requirePermission(role: Role, anyOf: Permissions[]) {
  if (!anyOf.some((permissions) => can(role, permissions))) {
    throw notFound();
  }
}
