import { $checkAccountDeletion } from "@/lib/functions/account";
import { queryOptions } from "@tanstack/react-query";

/**
 * Whether the viewer may delete their account, and how they confirm it. The
 * answer depends on who is signed in and how recently, and can change at any
 * moment, so it isn't prefetched and is fetched again on each open. Suspense
 * keeps an answer for at least a second, so reopening within it reuses it.
 */
export const accountDeletionQuery = queryOptions({
  queryKey: ["account-deletion"],
  queryFn: ({ signal }) => $checkAccountDeletion({ signal }),
  staleTime: 0,
  gcTime: 0,
});
