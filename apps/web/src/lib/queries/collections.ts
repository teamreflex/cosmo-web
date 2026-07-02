import { queryOptions } from "@tanstack/react-query";
import { $fetchCollectionBySlug } from "../functions/collections";

/**
 * Fetch a single collection by slug for the admin collection editor.
 */
export function adminCollectionQuery(slug: string) {
  return queryOptions({
    queryKey: ["admin", "collection", slug],
    queryFn: ({ signal }) => $fetchCollectionBySlug({ signal, data: { slug } }),
    enabled: slug.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
