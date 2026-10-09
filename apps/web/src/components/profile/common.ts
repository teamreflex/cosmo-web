import type { targetAccountQuery } from "@/lib/queries/core";
import type { FullAccount } from "@/lib/universal/cosmo-accounts";
import type { QueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

/**
 * Loads a profile's target account, throwing `notFound()` when its user is
 * deleted. The profile layout's `beforeLoad` calls it so no child loader
 * fetches anything for a deleted account, and the layout's
 * `notFoundComponent` shows the deleted state; loaders call it for the
 * narrowed account.
 */
export async function ensureProfileTarget(
  queryClient: QueryClient,
  options: ReturnType<typeof targetAccountQuery>,
): Promise<FullAccount> {
  const target = await queryClient.ensureQueryData(options);
  if (target.status === "deleted") {
    throw notFound();
  }
  return target;
}
