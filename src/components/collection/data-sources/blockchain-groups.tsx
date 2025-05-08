import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { objektOptions } from "@/hooks/use-objekt-response";
import {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { ofetch } from "ofetch";
import { useCallback } from "react";
import GroupedObjekt from "@/components/objekt/objekt-collection-group";
import { useProfileContext } from "@/hooks/use-profile";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import LoaderRemote from "@/components/objekt/loader-remote";
import { baseUrl } from "@/lib/query-client";
import { useSelectedArtists } from "@/hooks/use-selected-artists";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";

const INITIAL_PAGE = 1;
const PAGE_SIZE = 30;

type Props = {
  gridColumns: number;
  targetCosmo: PublicCosmo;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

export default function BlockchainGroups(props: Props) {
  const authenticated = useProfileContext((ctx) => ctx.authenticated);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const pins = useProfileContext((ctx) => ctx.pins);
  const [filters] = useCosmoFilters();
  const isDesktop = useMediaQuery();
  const { selectedIds } = useSelectedArtists();

  const usingFilters = filtersAreDirty(filters);
  const gridColumns = isDesktop ? props.gridColumns : 3;

  /**
   * Determine if the group should be rendered
   */
  const shouldRender = useCallback(
    (group: BFFCollectionGroup) => {
      const tokenIds = group.objekts.map((objekt) => objekt.metadata.tokenId);
      const allLocked = tokenIds.every((tokenId) =>
        lockedObjekts.includes(tokenId)
      );

      // hide collection when all objekts are locked
      return props.showLocked ? true : !allLocked;
    },
    [lockedObjekts, props.showLocked]
  );

  /**
   * Query options
   */
  const options = objektOptions({
    filtering: "remote",
    queryKey: ["collection", "blockchain-groups", props.targetCosmo.address],
    queryFunction: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/api/bff/v1/objekt/collection-group/${props.targetCosmo.address}`,
        baseUrl()
      ).toString();

      const searchParams = new URLSearchParams(props.searchParams);

      // add required params
      searchParams.set("page", pageParam.toString());
      searchParams.set("size", PAGE_SIZE.toString());

      // remap artist to artistName
      if (searchParams.has("artist")) {
        searchParams.set("artistName", searchParams.get("artist") ?? "");
        searchParams.delete("artist");
      }

      // remap sort param to order
      if (searchParams.has("sort")) {
        searchParams.set("order", searchParams.get("sort") ?? "newest");
        searchParams.delete("sort");
      }

      return await ofetch<BFFCollectionGroupResponse>(endpoint, {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          artists: selectedIds,
        },
      });
    },
    initialPageParam: INITIAL_PAGE,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      lastPageParam ??= INITIAL_PAGE;
      return lastPage.collections.length === PAGE_SIZE
        ? lastPageParam + 1
        : undefined;
    },
    calculateTotal: (data) => {
      const total = data.pages[0].collectionCount ?? 0;
      return (
        <p className="font-semibold text-end">
          {total.toLocaleString("en")} types
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
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
            getObjektId={(item) => item.collection.collectionId}
            authenticated={authenticated}
            gridColumns={gridColumns}
          >
            {({ item, priority }) => (
              <GroupedObjekt
                group={item}
                gridColumns={props.gridColumns}
                showLocked={props.showLocked}
                priority={priority}
              />
            )}
          </VirtualizedGrid>
        )}
      </LoaderRemote>
    </FilteredObjektDisplay>
  );
}
