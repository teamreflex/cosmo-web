import { queryOptions } from "@tanstack/react-query";
import { $fetchListShelf } from "../functions/lists";

/**
 * Fetch a user's lists for the profile shelf. Keyed by user id so list
 * mutations can refresh it regardless of how the profile was opened.
 */
export const listShelfQuery = (userId: string) =>
  queryOptions({
    queryKey: ["list-shelf", userId],
    queryFn: ({ signal }) => $fetchListShelf({ signal, data: { userId } }),
  });
