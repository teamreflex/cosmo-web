import { useCallback } from "react";
import { BlockchainGroupsGridItem } from "./blockchain-groups-grid-item";
import type { BFFCollectionGroup } from "@apollo/cosmo/types/objekts";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useProfileContext } from "@/hooks/use-profile";
import VirtualizedObjektGrid from "@/components/objekt/virtualized-objekt-grid";
import { useArtists } from "@/hooks/use-artists";
import { useAuthenticated } from "@/hooks/use-authenticated";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { userCollectionBlockchainGroupsQuery } from "@/lib/queries/objekt-queries";
import { m } from "@/i18n/messages";

type Props = {
  gridColumns: number;
  targetCosmo: PublicCosmo;
  showLocked: boolean;
};

export default function BlockchainGroups(props: Props) {
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const pins = useProfileContext((ctx) => ctx.pins);
  const authenticated = useAuthenticated();
  const { filters } = useCosmoFilters();
  const { selectedIds } = useArtists();
  const gridColumns = useGridColumns();

  const usingFilters = filtersAreDirty(filters);

  /**
   * Determine if the group should be rendered
   */
  const shouldRender = useCallback(
    (group: BFFCollectionGroup) => {
      const tokenIds = group.objekts.map((objekt) => objekt.metadata.tokenId);
      const allLocked = tokenIds.every((tokenId) =>
        lockedObjekts.includes(tokenId),
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
    filtering: "remote",
    query: userCollectionBlockchainGroupsQuery(
      props.targetCosmo.address,
      filters,
      selectedIds,
    ),
    calculateTotal: (data) => {
      const total = data.pages[0]?.collectionCount ?? 0;
      return (
        <p className="text-end font-semibold">
          {total.toLocaleString("en")} {m.blockchain_types()}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
  });

  return (
    <FilteredObjektDisplay gridColumns={gridColumns}>
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
        shouldRender={shouldRender}
        showTotal
      />
    </FilteredObjektDisplay>
  );
}
