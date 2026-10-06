import { $fetchCollectionListings } from "@/lib/functions/objekts/collection-listings";
import { queryOptions } from "@tanstack/react-query";

export const collectionListingsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["collection-listings", slug],
    queryFn: () => $fetchCollectionListings({ data: { slug } }),
    staleTime: 1000 * 60,
  });
