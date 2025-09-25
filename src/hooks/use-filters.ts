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

  // use separate state for apollo features so a refetch doesn't occur
  const showLocked = searchParams.locked ?? true;
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
    (state: boolean | null) => {
      navigate({
        // @ts-ignore - TODO: fix
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
    setFilters(defaultFilters);
  }

  return {
    // masks the fact that null means show locked
    showLocked: showLocked ?? true,
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
  return (
    !filters.member ||
    !filters.artist ||
    filters.sort !== "newest" ||
    (filters.class ?? []).length > 0 ||
    (filters.season ?? []).length > 0 ||
    (filters.on_offline ?? []).length > 0 ||
    filters.transferable !== false ||
    filters.gridable !== false ||
    (filters.collectionNo ?? []).length > 0
  );
}
