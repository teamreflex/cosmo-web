"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { IndexedCosmoResponse, parsePage } from "@/lib/universal/objekts";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useCallback } from "react";
import {
  FiltersContainer,
  StatsFilters,
} from "../collection/filters-container";
import { ofetch } from "ofetch";
import Hydrated from "../hydrated";
import MemberFilterSkeleton from "../skeleton/member-filter-skeleton";
import MemberFilter from "../collection/member-filter";
import { ValidArtists } from "@/lib/universal/cosmo/common";

const queryKey = ["objekt-stats"];

type Props = {
  artists: CosmoArtistWithMembers[];
  collections: string[];
};

export default function StatsRenderer({ artists, collections }: Props) {
  const [
    searchParams,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(async () => {
    return await ofetch("/api/stats", {
      query: Object.fromEntries(searchParams.entries()),
    }).then((res) => parsePage<IndexedCosmoResponse>(res));
  }, [searchParams]);

  const setActiveMember = useCallback((member: string) => {
    setCosmoFilters((prev) => ({
      ...prev,
      artist: null,
      member: prev.member === member ? null : member,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveArtist = useCallback((artist: string) => {
    setCosmoFilters((prev) => ({
      ...prev,
      member: null,
      artist: prev.artist === artist ? null : (artist as ValidArtists),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col">
      <FiltersContainer>
        <StatsFilters
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
          collections={collections}
        />
      </FiltersContainer>

      <Hydrated fallback={<MemberFilterSkeleton />}>
        <MemberFilter
          artists={artists}
          active={cosmoFilters.artist ?? cosmoFilters.member}
          updateArtist={setActiveArtist}
          updateMember={setActiveMember}
        />
      </Hydrated>
    </div>
  );
}
