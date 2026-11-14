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
import { userCollectionBlockchainQuery } from "@/lib/queries/objekt-queries";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { Addresses, isEqual } from "@apollo/util";
import { useCallback } from "react";
import { BlockchainGridItem } from "./blockchain-grid-item";

type Props = {
  gridColumns: number;
  targetCosmo: PublicCosmo;
  showLocked: boolean;
};

export default function Blockchain(props: Props) {
  const lockedObjekts = useProfileLocks();
  const { pins, onReorderPins } = usePinReorder();
  const authenticated = useAuthenticated();
  const { filters } = useCosmoFilters();
  const { selectedIds } = useArtists();
  const gridColumns = useGridColumns();

  const usingFilters = filtersAreDirty(filters) || !props.showLocked;
  const isSpin = isEqual(props.targetCosmo.address, Addresses.SPIN);

  /**
   * Determine if the objekt should be rendered
   */
  const shouldRender = useCallback(
    ({ objekt: { tokenId } }: Objekt.Objekt) => {
      const isLocked = lockedObjekts.includes(tokenId);
      const isPinned = pins.some(
        (pin) => pin.kind === "objekt" && pin.objekt.objekt.tokenId === tokenId,
      );

      // hide objekt from list when it's pinned
      const shouldDisplayPinned = !usingFilters && !isPinned;

      // hide locked objekts when the filter is toggled
      const shouldDisplayLocked = props.showLocked ? true : !isLocked;

      return usingFilters
        ? shouldDisplayLocked
        : shouldDisplayLocked && shouldDisplayPinned;
    },
    [lockedObjekts, pins, usingFilters, props.showLocked],
  );

  /**
   * Query options
   */
  const options = objektOptions({
    query: userCollectionBlockchainQuery(
      props.targetCosmo.address,
      filters,
      selectedIds,
    ),
    totalPortalTarget: "#profile-total-stat",
    calculateTotal: (data) => {
      if (isSpin) {
        return null;
      }

      const total = data.pages[0]?.total ?? 0;
      return <ProfileTotalStat title={m.objekts_header()} count={total} />;
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <VirtualizedObjektGrid
      options={options}
      gridColumns={gridColumns}
      getObjektId={(item) => String(item.objekt.tokenId)}
      authenticated={authenticated}
      ItemComponent={BlockchainGridItem}
      itemComponentProps={{ authenticated }}
      pins={pins}
      hidePins={usingFilters}
      onReorderPins={onReorderPins}
      shouldRender={shouldRender}
    />
  );
}
