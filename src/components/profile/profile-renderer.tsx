"use client";

import { SlidersHorizontal } from "lucide-react";
import { Toggle } from "../ui/toggle";
import {
  CollectionFilters,
  collectionFilters,
  useCollectionFilters,
} from "@/hooks/use-collection-filters";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import { useState } from "react";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { LockedFilter } from "../collection/filter-locked";
import { GridableFilter } from "../collection/filter-gridable";
import { TransferableFilter } from "../collection/filter-transferable";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
import CollectionObjektDisplay from "../collection/collection-objekt-display";

export type PropsWithFilters<T extends keyof CollectionFilters> = {
  filters: CollectionFilters[T];
  setFilters: (filters: CollectionFilters[T]) => void;
};

type Props = {
  lockedObjekts: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
};

export default function ProfileRenderer({
  lockedObjekts,
  artists,
  nickname,
  address,
}: Props) {
  const [
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    updateFilter,
    showLocked,
    setShowLocked,
  ] = useCollectionFilters();

  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      true,
      ["show_locked"]
    );
    searchParams.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${searchParams.toString()}`
    );
    return (await result.json()) as OwnedObjektsResult;
  }

  return (
    <>
      <div className="flex flex-col group" data-show={showFilters}>
        {/* header */}
        <div className="flex sm:hidden justify-center items-center gap-2 pb-2">
          {/* show filters */}
          <Toggle
            variant="secondary"
            size="sm"
            pressed={showFilters}
            onPressedChange={setShowFilters}
          >
            <SlidersHorizontal className="mr-2" />
            <span>Filters</span>
          </Toggle>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
          <GridableFilter
            filters={filters.gridable}
            setFilters={(f) => updateFilter("gridable", f)}
          />
          <TransferableFilter
            filters={filters.transferable}
            setFilters={(f) => updateFilter("transferable", f)}
          />
          <SeasonFilter
            filters={filters.season}
            setFilters={(f) => updateFilter("season", f)}
          />
          <OnlineFilter
            filters={filters.on_offline}
            setFilters={(f) => updateFilter("on_offline", f)}
          />
          <ClassFilter
            filters={filters.class}
            setFilters={(f) => updateFilter("class", f)}
          />
          <SortFilter
            filters={filters.sort}
            setFilters={(f) => updateFilter("sort", f)}
          />
        </div>
      </div>

      <CollectionObjektDisplay
        authenticated={nickname === undefined}
        address={address}
        lockedTokenIds={lockedObjekts}
        showLocked={showLocked}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        queryFunction={fetcher}
      />
    </>
  );
}
