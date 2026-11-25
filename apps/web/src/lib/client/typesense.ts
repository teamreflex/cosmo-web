import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { env } from "@/lib/env/client";
import {
  type CollectionSort,
  collectionSorts,
  supportedSort,
} from "@/lib/universal/sorts";
import { SearchClient } from "typesense";
import type { ObjektResponse } from "../universal/objekts";
import {
  type CollectionDocument,
  collectionDocumentSchema,
} from "../universal/schema/search";

const PER_PAGE = 30;

const typesense = new SearchClient({
  nodes: [
    {
      url: env.VITE_TYPESENSE_URL,
    },
  ],
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
        query_by: "members,description,season,shortCode",
        query_by_weights: "3,2,1,1",
        sort_by: buildSortBy(supportedSort(filters.sort, collectionSorts)),
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
    objekts: hits.map((hit) => collectionDocumentSchema.parse(hit.document)),
    hasNext,
    nextStartAfter,
  } satisfies ObjektResponse<CollectionDocument>;
}

/**
 * Collections matching a free-text search such as "KimLip 201Z", best
 * match first. Unlike the index search it reads collection numbers.
 */
export async function searchCollections(query: string) {
  const result = await typesense.collections("collections").documents().search(
    {
      q: query,
      query_by: "members,collectionNo,season,shortCode,description",
      query_by_weights: "3,3,2,1,1",
      sort_by: "_text_match:desc,createdAt:desc",
      per_page: 20,
    },
    { cacheSearchResultsForSeconds: 60 },
  );

  return (result.hits ?? []).map((hit) =>
    collectionDocumentSchema.parse(hit.document),
  );
}

/**
 * Map the selected sort to a Typesense sort_by expression. Typesense has no
 * serials or mint counts, so only collection sorts apply.
 */
function buildSortBy(sort: CollectionSort): string {
  switch (sort) {
    case "newest":
      return "createdAt:desc";
    case "oldest":
      return "createdAt:asc";
    case "noAscending":
      return "collectionNo:asc,createdAt:asc";
    case "noDescending":
      return "collectionNo:desc,createdAt:asc";
    case "memberAsc":
      return "memberSortOrder(missing_values: last):asc,collectionNo:asc,createdAt:asc";
    case "memberDesc":
      return "memberSortOrder(missing_values: last):desc,collectionNo:asc,createdAt:asc";
  }
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

  // member filter, matching any member a collection names
  if (filters.member && filters.member.length > 0) {
    allFilters.push(`members:[${filters.member.join(",")}]`);
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
