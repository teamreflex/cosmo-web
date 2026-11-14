import VirtualizedObjektGrid from "@/components/objekt/virtualized-objekt-grid";
import ProfileTotalStat from "@/components/profile/profile-total-stat";
import { useArtists } from "@/hooks/use-artists";
import { useAuthenticated } from "@/hooks/use-authenticated";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { objektOptions } from "@/hooks/use-objekt-response";
import { usePinReorder } from "@/hooks/use-pin-reorder";
import { useProfileLocks } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { userCollectionBlockchainGroupsQuery } from "@/lib/queries/objekt-queries";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useCallback } from "react";
import { BlockchainGroupsGridItem } from "./blockchain-groups-grid-item";

type Props = {
  gridColumns: number;
  targetCosmo: PublicCosmo;
  showLocked: boolean;
};

export default function BlockchainGroups(props: Props) {
  const lockedObjekts = useProfileLocks();
  const { pins, onReorderPins } = usePinReorder();
  const authenticated = useAuthenticated();
  const { filters } = useCosmoFilters();
  const { selectedIds } = useArtists();
  const gridColumns = useGridColumns();

  const usingFilters = filtersAreDirty(filters) || !props.showLocked;

  /**
   * Determine if the group should be rendered
   */
  const shouldRender = useCallback(
    (group: Objekt.Group) => {
      const allLocked = group.objekts.every((objekt) =>
        lockedObjekts.includes(objekt.tokenId),
      );

      // hide collection when all objekts are locked
      return props.showLocked ? true : !allLocked;
    },
    [lockedObjekts, props.showLocked],
  );

  /**
   * Query options
   */
  const options = objektOptions({
    query: userCollectionBlockchainGroupsQuery(
      props.targetCosmo.address,
      filters,
      selectedIds,
    ),
    totalPortalTarget: "#profile-total-stat",
    calculateTotal: (data) => {
      const total = data.pages[0]?.collectionCount ?? 0;
      return <ProfileTotalStat title={m.blockchain_types()} count={total} />;
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
  });

  return (
    <VirtualizedObjektGrid
      options={options}
      gridColumns={gridColumns}
      getObjektId={(item) => item.collection.collectionId}
      authenticated={authenticated}
      ItemComponent={BlockchainGroupsGridItem}
      itemComponentProps={{
        gridColumns: props.gridColumns,
        showLocked: props.showLocked,
      }}
      pins={pins}
      hidePins={usingFilters}
      onReorderPins={onReorderPins}
      shouldRender={shouldRender}
    />
  );
}
