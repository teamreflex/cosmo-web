import { $checkAccountDeletion } from "@/lib/functions/account";
import { queryOptions } from "@tanstack/react-query";

/**
 * Whether the viewer may delete their account, and how they confirm it. The
 * answer depends on who is signed in and how recently, and can change at any
 * moment, so it is never reused.
 */
export const accountDeletionQuery = queryOptions({
  queryKey: ["account-deletion"],
  queryFn: ({ signal }) => $checkAccountDeletion({ signal }),
  staleTime: 0,
  gcTime: 0,
});
