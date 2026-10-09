import { $checkAccountDeletion } from "@/lib/functions/account";
import { queryOptions } from "@tanstack/react-query";

/**
 * Whether the viewer may delete their account. The answer depends on who is
 * signed in and can change at any moment, so it is never reused.
 */
export const accountDeletionQuery = queryOptions({
  queryKey: ["account-deletion"],
  queryFn: ({ signal }) => $checkAccountDeletion({ signal }),
  staleTime: 0,
  gcTime: 0,
});
