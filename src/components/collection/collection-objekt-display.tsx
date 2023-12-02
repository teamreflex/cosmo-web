import { LockedObjektContext } from "@/context/objekt";
import { CollectionFilters } from "@/hooks/use-collection-filters";
import { useState } from "react";
import FilteredObjektDisplay, {
  ObjektResponse,
} from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import InformationOverlay from "../objekt/information-overlay";
import ActionOverlay from "../objekt/action-overlay";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";

type Props = {
  authenticated: boolean;
  address: string;
  lockedTokenIds: number[];
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  setFilters: (filters: CollectionFilters) => void;
  queryFunction: ({
    pageParam,
  }: {
    pageParam?: number;
  }) => Promise<ObjektResponse<OwnedObjekt>>;
};

export default function CollectionObjektDisplay({
  authenticated,
  address,
  lockedTokenIds,
  showLocked,
  artists,
  filters,
  setFilters,
  queryFunction,
}: Props) {
  const [lockedTokens, setLockedTokens] = useState<number[]>(lockedTokenIds);

  function onTokenLock(tokenId: number) {
    if (lockedTokens.includes(tokenId)) {
      setLockedTokens((prev) => prev.filter((id) => id !== tokenId));
    } else {
      setLockedTokens((prev) => [...prev, tokenId]);
    }
  }

  function shouldShowObjekt(objekt: OwnedObjekt) {
    return showLocked
      ? true
      : lockedTokens.includes(parseInt(objekt.tokenId)) === false;
  }

  return (
    <LockedObjektContext.Provider
      value={{
        lockedObjekts: lockedTokens,
        lockObjekt: onTokenLock,
      }}
    >
      <FilteredObjektDisplay
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        authenticated={authenticated}
        queryFunction={queryFunction}
        queryKey={["collection", address]}
        getObjektId={(objekt: OwnedObjekt) => objekt.tokenId}
        getObjektDisplay={shouldShowObjekt}
        objektSlot={
          <>
            <ObjektSidebar />
            <InformationOverlay />
            <ActionOverlay />
          </>
        }
      />
    </LockedObjektContext.Provider>
  );
}
