import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { defaultFilters, useCosmoFilters } from "./use-cosmo-filters";
import type { CosmoFilters } from "./use-cosmo-filters";
import type { CollectionDataSource } from "@/lib/utils";

type DefaultOptions = {
  dataSource?: CollectionDataSource;
};

export function useFilters(opts?: DefaultOptions) {
  const searchParams = useSearch({
    strict: false,
  });
  const navigate = useNavigate();

  // setup cosmo filters
  const [cosmoFilters, setCosmoFilters] = useCosmoFilters();

  // use separate state for apollo features so a refetch doesn't occur
  const showLocked = searchParams.locked ?? true;
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

  const cosmoSearchParams = useMemo(
    () => toSearchParams(cosmoFilters, true),
    [cosmoFilters]
  );

  const setShowLocked = useCallback(
    (state: boolean | null) => {
      navigate({
        search: (prev) => ({
          ...prev,
          locked: state,
        }),
      });
    },
    [searchParams]
  );

  function reset() {
    setShowLocked(null);
    setCosmoFilters(defaultFilters);
  }

  return {
    // masks the fact that null means show locked
    showLocked: showLocked ?? true,
    setShowLocked,
    dataSource,
    setDataSource,
    searchParams: cosmoSearchParams,
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
    } else if (typeof value === "boolean") {
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
    !filters.member ||
    !filters.artist ||
    filters.sort !== "newest" ||
    filters.class.length > 0 ||
    filters.season.length > 0 ||
    filters.on_offline.length > 0 ||
    filters.transferable !== false ||
    filters.gridable !== false ||
    filters.collectionNo.length > 0
  );
}
