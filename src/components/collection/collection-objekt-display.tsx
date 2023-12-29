import { LockedObjektContext } from "@/context/objekt";
import { Fragment, memo, useCallback, useState } from "react";
import FilteredObjektDisplay, {
  ObjektResponse,
} from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import InformationOverlay from "../objekt/information-overlay";
import ActionOverlay from "../objekt/action-overlay";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { QueryFunction, QueryKey } from "@tanstack/react-query";
import { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = {
  authenticated: boolean;
  address: string;
  lockedTokenIds: number[];
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  queryFunction: QueryFunction<
    ObjektResponse<OwnedObjekt>,
    QueryKey,
    number | undefined
  >;
};

export default memo(function CollectionObjektDisplay({
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

  const lockFilter = useCallback(
    (objekt: OwnedObjekt) => {
      return showLocked
        ? true
        : lockedTokens.includes(parseInt(objekt.tokenId)) === false;
    },
    [showLocked]
  );

  const getObjektId = useCallback((objekt: OwnedObjekt) => objekt.tokenId, []);
  const queryKey = ["collection", address];

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
        queryKey={queryKey}
        getObjektId={getObjektId}
        getObjektDisplay={lockFilter}
        objektSlot={<ObjektSlot />}
      />
    </LockedObjektContext.Provider>
  );
});

function ObjektSlot() {
  return (
    <Fragment>
      <ObjektSidebar />
      <InformationOverlay />
      <ActionOverlay />
    </Fragment>
  );
}
