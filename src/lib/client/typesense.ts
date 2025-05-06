import { env } from "@/env";
import { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { SearchClient } from "typesense";
import { IndexedObjekt } from "../universal/objekts";

const PER_PAGE = 30;

const typesense = new SearchClient({
  nodes: [{ url: env.NEXT_PUBLIC_TYPESENSE_URL }],
  apiKey: env.NEXT_PUBLIC_TYPESENSE_KEY,
  numRetries: 2,
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.5,
});

type GetTypesenseResultsProps = {
  query: string;
  filters: CosmoFilters;
  page: number;
};

/**
 * Get results from Typesense.
 */
export async function getTypesenseResults({
  query,
  filters,
  page,
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
        filter_by: buildFilterBy(filters),
      },
      {
        cacheSearchResultsForSeconds: 60, // cache for 60 seconds
      }
    );

  const hits = result.hits ?? [];
  const hasNext = hits.length === PER_PAGE;
  const nextStartAfter = hasNext ? page + 1 : undefined;

  return {
    total: result.found,
    objekts: hits.map((hit) => hit.document as IndexedObjekt),
    hasNext,
    nextStartAfter,
  };
}

/**
 * Build a filter string for Typesense.
 */
function buildFilterBy(filters: CosmoFilters) {
  const filterBy: string[] = [];

  if (filters.artist) {
    filterBy.push(`artist:${filters.artist}`);
  }

  if (filters.member) {
    filterBy.push(`member:${filters.member}`);
  }

  if (filters.season && filters.season.length > 0) {
    filterBy.push(`season:[${filters.season.join(",")}]`);
  }

  if (filters.class && filters.class.length > 0) {
    filterBy.push(`class:[${filters.class.join(",")}]`);
  }

  if (filters.collectionNo && filters.collectionNo.length > 0) {
    filterBy.push(`collectionNo:[${filters.collectionNo.join(",")}]`);
  }

  return filterBy.join(" && ");
}
