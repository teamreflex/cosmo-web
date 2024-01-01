"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { IndexedCosmoResponse, parsePage } from "@/lib/universal/objekts";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { memo, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import { ofetch } from "ofetch";

const queryKey = ["objekt-index"];

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

  return (
    <div className="flex flex-col">
      <Title />

      <FiltersContainer>
        <IndexFilters
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
          collections={collections}
        />
      </FiltersContainer>

      <p>stats</p>
    </div>
  );
}

const Title = memo(function Title() {
  return (
    <div className="flex gap-2 items-center w-full pb-1">
      <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
        Objekt Stats
      </h1>
    </div>
  );
});
