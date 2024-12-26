import { parseAsBoolean, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { CosmoFilters, useCosmoFilters } from "./use-cosmo-filters";

export type CollectionDataSource = "cosmo" | "cosmo-legacy" | "blockchain";

type DefaultOptions = {
  dataSource?: CollectionDataSource;
};

export function useFilters(opts?: DefaultOptions) {
  // setup cosmo filters
  const [cosmoFilters] = useCosmoFilters();

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
    return opts?.dataSource ?? "cosmo-legacy";
  });

  const searchParams = useMemo(() => {
    return toSearchParams(
      {
        ...cosmoFilters,
        sort: cosmoFilters.sort ?? "newest",
      },
      true
    );
  }, [cosmoFilters]);

  return {
    // masks the fact that null means show locked
    showLocked: showLocked ?? true,
    setShowLocked,
    dataSource,
    setDataSource,
    searchParams,
  };
}

/**
 * Converts a parsed query string into a Cosmo-compatible URLSearchParams.
 */
function toSearchParams(input: CosmoFilters, join = false): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    // filter out empty values
    if (
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    switch (typeof value) {
      case "string":
        query.set(key, value);
        break;
      case "boolean":
        if (value) {
          query.set(key, "true");
        }
        break;
      case "object":
        if (Array.isArray(value)) {
          if (join) {
            query.set(key, value.join(","));
          } else {
            for (const item of value) {
              query.append(key, item);
            }
          }
        }
        break;
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
