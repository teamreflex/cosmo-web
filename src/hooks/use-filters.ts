import { parseAsBoolean, useQueryState } from "nuqs";
import { useState } from "react";
import { CosmoFilters, useCosmoFilters } from "./use-cosmo-filters";
import { CollectionDataSource } from "@/lib/utils";

type DefaultOptions = {
  dataSource?: CollectionDataSource;
};

export function useFilters(opts?: DefaultOptions) {
  // setup cosmo filters
  const [cosmoFilters, setCosmoFilters] = useCosmoFilters();

  // use separate state for apollo features so a refetch doesn't occur
  const [showLocked, setShowLocked] = useQueryState("locked", parseAsBoolean);
  const [dataSource, setDataSource] = useState<CollectionDataSource>(() => {
    // upon first render, adjust data source based on source-specific filters
    const useBlockchain =
      cosmoFilters.sort === "serialAsc" || cosmoFilters.sort === "serialDesc";
    if (useBlockchain) {
      return "blockchain";
    }

    // otherwise, use the default data source
    return opts?.dataSource ?? "blockchain";
  });

  const searchParams = toSearchParams(
    {
      ...cosmoFilters,
      sort: cosmoFilters.sort ?? "newest",
    },
    true
  );

  function reset() {
    setShowLocked(null);
    setCosmoFilters({
      member: null,
      artist: null,
      sort: null,
      class: null,
      season: null,
      on_offline: null,
      transferable: null,
      gridable: null,
      used_for_grid: null,
      collectionNo: null,
      collection: null,
    });
  }

  return {
    // masks the fact that null means show locked
    showLocked: showLocked ?? true,
    setShowLocked,
    dataSource,
    setDataSource,
    searchParams,
    reset,
  };
}

/**
 * Converts a parsed query string into a Cosmo-compatible URLSearchParams.
 */
function toSearchParams(input: CosmoFilters, join = false): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (!value || (Array.isArray(value) && !value.length)) continue;

    if (typeof value === "string") {
      query.set(key, value);
    } else if (typeof value === "boolean" && value) {
      query.set(key, "true");
    } else if (Array.isArray(value)) {
      if (join) {
        query.set(key, value.join(","));
      } else {
        for (const item of value) {
          query.append(key, item);
        }
      }
    }
  }

  return query;
}

/**
 * Determine if the given filters are dirty.
 */
export function filtersAreDirty(filters: CosmoFilters) {
  return (
    filters.member !== null ||
    filters.artist !== null ||
    filters.sort !== null ||
    filters.class !== null ||
    filters.season !== null ||
    filters.on_offline !== null ||
    filters.transferable !== null ||
    filters.gridable !== null ||
    filters.used_for_grid !== null ||
    filters.collectionNo !== null ||
    filters.collection !== null
  );
}
