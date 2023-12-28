"use client";

import { SlidersHorizontal } from "lucide-react";
import { Toggle } from "../ui/toggle";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import CollectionObjektDisplay from "../collection/collection-objekt-display";
import { CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useCallback } from "react";
import {
  CollectionFilters,
  FiltersContainer,
} from "../collection/filters-container";
import Portal from "../portal";

export type PropsWithFilters<T extends keyof CosmoFilters> = {
  filters: CosmoFilters[T];
  setFilters: (filters: CosmoFilters[T]) => void;
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
    searchParams,
    showFilters,
    setShowFilters,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("start_after", pageParam.toString());

      const result = await fetch(
        `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${query.toString()}`
      );
      return (await result.json()) as OwnedObjektsResult;
    },
    [address, searchParams]
  );

  return (
    <>
      <div className="flex flex-col group" data-show={showFilters}>
        <Portal to="#filters-button">
          <Toggle
            className="rounded-full"
            variant="secondary"
            size="sm"
            pressed={showFilters}
            onPressedChange={setShowFilters}
          >
            <SlidersHorizontal className="mr-2" />
            <span>Filters</span>
          </Toggle>
        </Portal>

        {/* filters */}
        <FiltersContainer>
          <CollectionFilters
            showLocked={showLocked}
            setShowLocked={setShowLocked}
            cosmoFilters={cosmoFilters}
            updateCosmoFilters={updateCosmoFilters}
          />
        </FiltersContainer>
      </div>

      <CollectionObjektDisplay
        authenticated={nickname === undefined}
        address={address}
        lockedTokenIds={lockedObjekts}
        showLocked={showLocked}
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        queryFunction={queryFunction}
      />
    </>
  );
}
