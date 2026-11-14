import { queryOptions } from "@tanstack/react-query";
import {
  $fetchListShelf,
  $fetchObjektList,
  $getObjektListWithUser,
} from "../functions/lists";

/**
 * Fetch a user's lists for the profile shelf. Keyed by user id so list
 * mutations can refresh it regardless of how the profile was opened.
 */
export const listShelfQuery = (userId: string) =>
  queryOptions({
    queryKey: ["list-shelf", userId],
    queryFn: ({ signal }) => $fetchListShelf({ signal, data: { userId } }),
  });

/**
 * Prefix of the list detail queries. Only loaders read them, so nothing
 * refetches one in the background: a mutation that creates, edits or deletes
 * a list invalidates the prefix, and the next loader run fetches again.
 */
export const objektListDetailKey = ["objekt-list-detail"] as const;

/**
 * How long a loader reuses a list's details, which covers a run of filter
 * changes. A change made in another tab or by another user, such as the
 * owner's new username, shows up once it has passed.
 */
const LIST_DETAIL_STALE_TIME = 30_000;

/**
 * Fetch a list's details by its owner and slug.
 */
export const objektListDetailQuery = (userId: string, slug: string) =>
  queryOptions({
    queryKey: [...objektListDetailKey, "slug", userId, slug],
    queryFn: ({ signal }) =>
      $fetchObjektList({ signal, data: { userId, slug } }),
    staleTime: LIST_DETAIL_STALE_TIME,
  });

/**
 * Fetch a list's details and its owner by id.
 */
export const objektListByIdQuery = (id: string) =>
  queryOptions({
    queryKey: [...objektListDetailKey, "id", id],
    queryFn: ({ signal }) => $getObjektListWithUser({ signal, data: { id } }),
    staleTime: LIST_DETAIL_STALE_TIME,
  });
