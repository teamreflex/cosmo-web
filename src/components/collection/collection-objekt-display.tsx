import { Fragment, memo, useCallback } from "react";
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
import { useProfileContext } from "@/hooks/use-profile";

const getObjektId = (objekt: OwnedObjekt) => objekt.tokenId;

type Props = {
  authenticated: boolean;
  address: string;
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
  showLocked,
  artists,
  filters,
  setFilters,
  queryFunction,
  gridColumns = GRID_COLUMNS,
  dataSource,
}: Props) {
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const pins = useProfileContext((ctx) => ctx.pins);

  const lockFilter = useCallback(
    (objekt: OwnedObjekt) => {
      return showLocked
        ? true
        : lockedObjekts.includes(parseInt(objekt.tokenId)) === false;
    },
    [showLocked, lockedObjekts]
  );

  return (
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
            isLocked={lockedObjekts.includes(parseInt(id))}
            isPinned={pins.findIndex((p) => p.tokenId === id) !== -1}
          />
        </ExpandableObjekt>
      )}
    </FilteredObjektDisplay>
  );
});

type OverlayProps = {
  objekt: OwnedObjekt;
  authenticated: boolean;
  isLocked: boolean;
  isPinned: boolean;
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  isLocked,
  isPinned,
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
        isPinned={isPinned}
      />
    </Fragment>
  );
});
