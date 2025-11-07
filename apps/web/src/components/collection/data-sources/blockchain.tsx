import { useCallback } from "react";
import { LegacyOverlay } from "./common-legacy";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { useProfileContext } from "@/hooks/use-profile";
import { objektOptions } from "@/hooks/use-objekt-response";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import ExpandableObjekt from "@/components/objekt/objekt-expandable";
import { Objekt } from "@/lib/universal/objekt-conversion";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import LoaderRemote from "@/components/objekt/loader-remote";
import { useArtists } from "@/hooks/use-artists";
import { useAuthenticated } from "@/hooks/use-authenticated";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { userCollectionBlockchainQuery } from "@/lib/queries/objekt-queries";
import { m } from "@/i18n/messages";

type Props = {
  gridColumns: number;
  targetCosmo: PublicCosmo;
  showLocked: boolean;
};

export default function Blockchain(props: Props) {
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const pins = useProfileContext((ctx) => ctx.pins);
  const authenticated = useAuthenticated();
  const { filters } = useCosmoFilters();
  const { selectedIds } = useArtists();
  const gridColumns = useGridColumns();

  const usingFilters = filtersAreDirty(filters);

  /**
   * Determine if the objekt should be rendered
   */
  const shouldRender = useCallback(
    (objekt: CosmoObjekt) => {
      const isLocked = lockedObjekts.includes(parseInt(objekt.tokenId));
      const isPinned =
        pins.findIndex((pin) => pin.tokenId === objekt.tokenId) !== -1;

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
    filtering: "remote",
    query: userCollectionBlockchainQuery(
      props.targetCosmo.address,
      filters,
      selectedIds,
    ),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="text-end font-semibold">
          {total.toLocaleString("en")} {m.blockchain_total()}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <FilteredObjektDisplay gridColumns={gridColumns}>
      <LoaderRemote
        options={options}
        shouldRender={shouldRender}
        gridColumns={gridColumns}
        hidePins={usingFilters}
        pins={pins}
        showTotal
      >
        {({ rows }) => (
          <VirtualizedGrid
            rows={rows}
            getObjektId={(item) => item.tokenId}
            authenticated={authenticated}
            gridColumns={gridColumns}
          >
            {({ item, id, isPin, priority }) => {
              const objekt = Objekt.fromLegacy(item);
              return (
                <ExpandableObjekt
                  collection={objekt.collection}
                  tokenId={id}
                  priority={priority}
                >
                  <LegacyOverlay
                    collection={objekt.collection}
                    token={objekt.objekt}
                    authenticated={authenticated}
                    isPin={isPin}
                  />
                </ExpandableObjekt>
              );
            }}
          </VirtualizedGrid>
        )}
      </LoaderRemote>
    </FilteredObjektDisplay>
  );
}
