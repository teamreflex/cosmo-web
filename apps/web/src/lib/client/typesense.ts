import { SearchClient } from "typesense";
import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import type { IndexedObjekt, ObjektResponse } from "../universal/objekts";
import { env } from "@/lib/env/client";

const PER_PAGE = 30;

const typesense = new SearchClient({
  nodes: [{ url: env.VITE_TYPESENSE_URL }],
  apiKey: env.VITE_TYPESENSE_KEY,
  numRetries: 2,
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.5,
});

type GetTypesenseResultsProps = {
  query: string;
  filters: CosmoFilters;
  page: number;
  artists: string[];
};

/**
 * Get results from Typesense.
 * Runs on both the client and server.
 */
export async function getTypesenseResults({
  query,
  filters,
  page,
  artists,
}: GetTypesenseResultsProps) {
  const result = await typesense
    .collections("collections")
    .documents()
    .search(
      {
        q: query,
        query_by: "member,description,season,shortCode",
        query_by_weights: "3,2,1,1",
        sort_by: "createdAt:desc",
        page: page,
        per_page: PER_PAGE,
        filter_by: buildFilterBy(filters, artists),
      },
      {
        cacheSearchResultsForSeconds: 60, // cache for 60 seconds
      },
    );

  const hits = result.hits ?? [];
  const hasNext = hits.length === PER_PAGE;
  const nextStartAfter = hasNext ? page + 1 : undefined;

  return {
    total: result.found,
    objekts: hits.map((hit) => hit.document as IndexedObjekt),
    hasNext,
    nextStartAfter,
  } satisfies ObjektResponse<IndexedObjekt>;
}

/**
 * Build a filter string for Typesense.
 */
function buildFilterBy(filters: CosmoFilters, artists: string[]) {
  const allFilters: string[] = [];

  // artist filter overrides selected artists array
  if (filters.artist) {
    allFilters.push(`artist:${filters.artist}`);
  } else if (artists.length > 0) {
    allFilters.push(`artist:[${artists.join(",")}]`);
  }

  // member filter
  if (filters.member) {
    allFilters.push(`member:${filters.member}`);
  }

  // season filter
  if (filters.season && filters.season.length > 0) {
    allFilters.push(`season:[${filters.season.join(",")}]`);
  }

  // class filter
  if (filters.class && filters.class.length > 0) {
    allFilters.push(`class:[${filters.class.join(",")}]`);
  }

  // collectionNo filter
  if (filters.collectionNo && filters.collectionNo.length > 0) {
    allFilters.push(`collectionNo:[${filters.collectionNo.join(",")}]`);
  }

  return allFilters.join(" && ");
}
