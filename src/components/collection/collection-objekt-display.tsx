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
import {
  CollectionDataSource,
  CosmoFilters,
  SetCosmoFilters,
} from "@/hooks/use-cosmo-filters";
import { ExpandableObjekt } from "../objekt/objekt";
import { GRID_COLUMNS } from "@/lib/utils";

const getObjektId = (objekt: OwnedObjekt) => objekt.tokenId;

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
  gridColumns?: number;
  dataSource: CollectionDataSource;
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
  gridColumns = GRID_COLUMNS,
  dataSource,
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

  return (
    <Fragment>
      <FilteredObjektDisplay
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        queryFunction={queryFunction}
        queryKey={["collection", address]}
        getObjektId={getObjektId}
        getObjektDisplay={lockFilter}
        gridColumns={gridColumns}
        dataSource={dataSource}
      >
        {({ objekt, id }, priority) => (
          <ExpandableObjekt objekt={objekt} id={id} priority={priority}>
            <Overlay
              objekt={objekt}
              authenticated={authenticated}
              isLocked={lockedTokens.includes(parseInt(id))}
              toggleLock={toggleLock}
            />
          </ExpandableObjekt>
        )}
      </FilteredObjektDisplay>
    </Fragment>
  );
});

type OverlayProps = {
  objekt: OwnedObjekt;
  authenticated: boolean;
  isLocked: boolean;
  toggleLock: (tokenId: number) => void;
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  isLocked,
  toggleLock,
}: OverlayProps) {
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
