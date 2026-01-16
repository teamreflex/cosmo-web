import type { CollectionDataSource } from "@apollo/util";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { defaultFilters, useCosmoFilters } from "./use-cosmo-filters";
import type { CosmoFilters } from "./use-cosmo-filters";

const route = getRouteApi("/@{$username}/");

type DefaultOptions = {
  dataSource?: CollectionDataSource;
};

/**
 * Combined objekt-related filters with profile-related filters.
 */
export function useFilters(opts?: DefaultOptions) {
  const searchParams = route.useSearch();
  const navigate = route.useNavigate();

  // setup cosmo filters
  const { filters, setFilters } = useCosmoFilters();

  const [dataSource, setDataSource] = useState<CollectionDataSource>(() => {
    // upon first render, adjust data source based on source-specific filters
    const useBlockchain =
      filters.sort === "serialAsc" || filters.sort === "serialDesc";
    if (useBlockchain) {
      return "blockchain";
    }

    // otherwise, use the default data source
    return opts?.dataSource ?? "blockchain";
  });

  const setShowLocked = useCallback(
    (state: boolean | undefined) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          locked: state,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  function reset() {
    setShowLocked(undefined);
    setFilters(defaultFilters);
  }

  return {
    // masks the fact that undefined means show locked
    showLocked: searchParams.locked ?? true,
    setShowLocked,
    dataSource,
    setDataSource,
    reset,
  };
}

/**
 * Determine if the given filters are dirty.
 */
export function filtersAreDirty(filters: CosmoFilters) {
  return Object.keys(filters).length > 0;
}
