import { Fragment, memo, useCallback, useMemo } from "react";
import FilteredObjektDisplay, {
  ObjektResponse,
} from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import InformationOverlay from "../objekt/information-overlay";
import ActionOverlay from "../objekt/action-overlay";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { QueryFunction, QueryKey } from "@tanstack/react-query";
import { CollectionDataSource, filtersAreDirty } from "@/hooks/use-filters";
import { ExpandableObjekt } from "../objekt/objekt";
import { GRID_COLUMNS } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

const getObjektId = (objekt: OwnedObjekt) => objekt.tokenId;

type Props = {
  authenticated: boolean;
  address: string;
  showLocked: boolean;
  artists: CosmoArtistWithMembers[];
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
  queryFunction,
  gridColumns = GRID_COLUMNS,
  dataSource,
}: Props) {
  const [filters] = useCosmoFilters();
  const hidePins = useMemo(() => filtersAreDirty(filters), [filters]);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const pins = useProfileContext((ctx) => ctx.pins);

  const collectionFilter = useCallback(
    (objekt: OwnedObjekt) => {
      // hide objekt from list when it's pinned
      const pinFilter =
        hidePins === false &&
        pins.findIndex((pin) => pin.tokenId === objekt.tokenId) === -1;

      // hide locked objekts when the filter is toggled
      const lockFilter = showLocked
        ? true
        : lockedObjekts.includes(parseInt(objekt.tokenId)) === false;

      return hidePins ? lockFilter : lockFilter && pinFilter;
    },
    [showLocked, lockedObjekts, hidePins, pins]
  );

  return (
    <FilteredObjektDisplay
      artists={artists}
      queryFunction={queryFunction}
      queryKey={["collection", address]}
      getObjektId={getObjektId}
      getObjektDisplay={collectionFilter}
      gridColumns={gridColumns}
      dataSource={dataSource}
      hidePins={hidePins}
    >
      {({ objekt, id }, priority, isPin) => (
        <ExpandableObjekt objekt={objekt} id={id} priority={priority}>
          <Overlay
            objekt={objekt}
            authenticated={authenticated}
            isLocked={lockedObjekts.includes(parseInt(id))}
            isPinned={pins.findIndex((p) => p.tokenId === id) !== -1}
            isPin={isPin}
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
  isPin: boolean;
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  isLocked,
  isPinned,
  isPin,
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
        isPin={isPin}
      />
    </Fragment>
  );
});
