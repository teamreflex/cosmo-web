"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useCallback } from "react";
import {
  CollectionFilters,
  FiltersContainer,
} from "../collection/filters-container";
import CollectionObjektDisplay from "../collection/collection-objekt-display";
import { parsePage } from "@/lib/universal/objekts";

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
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("start_after", pageParam.toString());

      const result = await fetch(
        `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${query.toString()}`
      );
      return parsePage<OwnedObjektsResult>(await result.json());
    },
    [address, searchParams]
  );

  return (
    <div className="flex flex-col">
      <FiltersContainer isPortaled>
        <CollectionFilters
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
        />
      </FiltersContainer>

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
    </div>
  );
}
