import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { LegacyObjektResponse, parsePage } from "@/lib/universal/objekts";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { useProfileContext } from "@/hooks/use-profile";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { objektOptions } from "@/hooks/use-objekt-response";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCallback, useMemo } from "react";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { ValidSort } from "@/lib/universal/cosmo/common";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { LegacyOverlay } from "./common-legacy";
import ExpandableObjekt from "@/components/objekt/objekt-expandable";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useMediaQuery } from "@/hooks/use-media-query";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import LoaderRemote from "@/components/objekt/loader-remote";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  gridColumns: number;
  targetUser: PublicProfile;
  currentUser?: PublicProfile;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

/**
 * @deprecated
 */
export default function CosmoLegacy(props: Props) {
  const [filters] = useCosmoFilters();
  const usingFilters = useMemo(() => filtersAreDirty(filters), [filters]);
  const pins = useProfileContext((ctx) => ctx.pins);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const isDesktop = useMediaQuery();

  const gridColumns = isDesktop ? props.gridColumns : 3;

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
    [lockedObjekts, pins, usingFilters, props.showLocked]
  );

  /**
   * Query options
   */
  const options = objektOptions({
    filtering: "remote",
    queryKey: ["collection", "cosmo-legacy", props.targetUser.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/objekt/v1/owned-by/${props.targetUser.address}`,
        COSMO_ENDPOINT
      ).toString();

      // ensure we don't send serial sorting to cosmo or else it 400's
      const sort = props.searchParams.get("sort") as ValidSort;
      const sortReset =
        sort === "serialAsc" || sort === "serialDesc" ? { sort: "newest" } : {};

      return await ofetch(endpoint, {
        query: {
          ...Object.fromEntries(props.searchParams.entries()),
          ...sortReset,
          start_after: pageParam.toString(),
        },
      }).then((res) => parsePage<LegacyObjektResponse<CosmoObjekt>>(res));
    },
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: () => null,
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <FilteredObjektDisplay artists={props.artists} gridColumns={gridColumns}>
      <LoaderRemote
        options={options}
        hidePins={usingFilters}
        shouldRender={shouldRender}
        gridColumns={gridColumns}
      >
        {({ rows, hidePins }) => (
          <VirtualizedGrid
            rows={rows}
            pins={pins}
            getObjektId={(item) => item.tokenId}
            authenticated={props.authenticated}
            gridColumns={gridColumns}
            hidePins={hidePins}
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
                    authenticated={props.authenticated}
                    isPinned={pins.findIndex((p) => p.tokenId === id) !== -1}
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
