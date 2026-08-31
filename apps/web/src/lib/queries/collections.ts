import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  $fetchCollectionBySlug,
  $fetchLatestCollections,
} from "../functions/collections";

/**
 * Fetch the most recently minted collections for the admin editor, one page
 * per pageParam so already-visited pages stay cached.
 */
export function latestCollectionsQuery() {
  return infiniteQueryOptions({
    queryKey: ["admin", "collections", "latest"],
    queryFn: ({ pageParam }) =>
      $fetchLatestCollections({ data: { page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNext ? allPages.length : undefined,
  });
}

/**
 * Fetch a single collection by slug for the admin collection editor.
 */
export function adminCollectionQuery(slug: string) {
  return queryOptions({
    queryKey: ["admin", "collection", slug],
    queryFn: ({ signal }) => $fetchCollectionBySlug({ signal, data: { slug } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
