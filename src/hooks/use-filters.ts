import { useCallback, useState } from "react";
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
      navigate({
        // @ts-ignore - TODO: fix
        search: (prev) => ({
          ...prev,
          locked: state,
        }),
      });
    },
    [searchParams],
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
