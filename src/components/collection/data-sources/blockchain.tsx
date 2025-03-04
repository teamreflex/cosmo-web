import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { LegacyObjektResponse, parsePage } from "@/lib/universal/objekts";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { baseUrl } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { objektOptions } from "@/hooks/use-objekt-response";
import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCallback } from "react";
import { filtersAreDirty } from "@/hooks/use-filters";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { LegacyOverlay } from "./common-legacy";
import ExpandableObjekt from "@/components/objekt/objekt-expandable";
import { Objekt } from "@/lib/universal/objekt-conversion";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
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

export default function Blockchain(props: Props) {
  const [filters] = useCosmoFilters();
  const pins = useProfileContext((ctx) => ctx.pins);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const isDesktop = useMediaQuery();

  const usingFilters = filtersAreDirty(filters);
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
    queryKey: ["collection", "blockchain", props.targetUser.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/api/objekts/by-address/${props.targetUser.address}`,
        baseUrl()
      ).toString();

      return await ofetch(endpoint, {
        query: {
          ...Object.fromEntries(props.searchParams.entries()),
          page: pageParam,
        },
      }).then((res) => parsePage<LegacyObjektResponse<CosmoObjekt>>(res));
    },
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: (data) => {
      const total = data.pages[0].total ?? 0;
      return (
        <p className="font-semibold">{total.toLocaleString("en")} total</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <FilteredObjektDisplay artists={props.artists} gridColumns={gridColumns}>
      <LoaderRemote
        options={options}
        hidePins={usingFilters}
        shouldRender={shouldRender}
        gridColumns={gridColumns}
        showTotal
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
