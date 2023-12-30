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
import Objekt from "../objekt/objekt";

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

  const toggleLock = useCallback((tokenId: number) => {
    setLockedTokens((prev) => {
      return prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId];
    });
  }, []);

  const lockFilter = useCallback(
    (objekt: OwnedObjekt) => {
      return showLocked
        ? true
        : lockedTokens.includes(parseInt(objekt.tokenId)) === false;
    },
    [showLocked, lockedTokens]
  );

  const getObjektId = useCallback((objekt: OwnedObjekt) => objekt.tokenId, []);
  const queryKey = ["collection", address];

  return (
    <FilteredObjektDisplay
      artists={artists}
      filters={filters}
      setFilters={setFilters}
      queryFunction={queryFunction}
      queryKey={queryKey}
      getObjektId={getObjektId}
      getObjektDisplay={lockFilter}
    >
      {({ objekt }) => (
        <Objekt objekt={objekt}>
          <Overlay
            objekt={objekt}
            authenticated={authenticated}
            lockedTokens={lockedTokens}
            toggleLock={toggleLock}
          />
        </Objekt>
      )}
    </FilteredObjektDisplay>
  );
});

type OverlayProps = {
  objekt: OwnedObjekt;
  authenticated: boolean;
  lockedTokens: number[];
  toggleLock: (tokenId: number) => void;
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  lockedTokens,
  toggleLock,
}: OverlayProps) {
  const isLocked = lockedTokens.includes(parseInt(objekt.tokenId));

  return (
    <Fragment>
      <ObjektSidebar
        collection={objekt.collectionNo}
        serial={objekt.objektNo}
      />
      <InformationOverlay objekt={objekt} />
      <ActionOverlay
        objekt={objekt}
        authenticated={authenticated}
        isLocked={isLocked}
        toggleLock={toggleLock}
      />
    </Fragment>
  );
});
