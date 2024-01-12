"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { ReactNode, useCallback } from "react";
import {
  CollectionFilters,
  FiltersContainer,
} from "../collection/filters-container";
import CollectionObjektDisplay from "../collection/collection-objekt-display";
import { parsePage } from "@/lib/universal/objekts";
import { ofetch } from "ofetch";
import Portal from "../portal";
import HelpDialog from "./help-dialog";
import { TokenPayload } from "@/lib/universal/auth";
import { PublicProfile } from "@/lib/universal/cosmo/auth";

type Props = {
  lockedObjekts: number[];
  artists: CosmoArtistWithMembers[];
  profile: PublicProfile;
  user?: TokenPayload;
  previousIds: ReactNode;
};

export default function ProfileRenderer({
  lockedObjekts,
  artists,
  profile,
  user,
  previousIds,
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
      const url = `${COSMO_ENDPOINT}/objekt/v1/owned-by/${profile.address}`;
      return await ofetch(url, {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          start_after: pageParam.toString(),
        },
      }).then((res) => parsePage<OwnedObjektsResult>(res));
    },
    [profile.address, searchParams]
  );

  return (
    <div className="flex flex-col">
      <Portal to="#help">
        <HelpDialog previousIds={previousIds} />
      </Portal>

      <FiltersContainer isPortaled>
        <CollectionFilters
          showLocked={showLocked}
          setShowLocked={setShowLocked}
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
        />
      </FiltersContainer>

      <CollectionObjektDisplay
        authenticated={profile.address === user?.address}
        address={profile.address}
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
