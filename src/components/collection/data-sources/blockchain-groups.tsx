import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useUserState } from "@/hooks/use-user-state";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { ofetch } from "ofetch";
import { useCallback, useMemo } from "react";
import GroupedObjekt from "@/components/objekt/objekt-collection-group";
import { useProfileContext } from "@/hooks/use-profile";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import LoaderRemote from "@/components/objekt/loader-remote";
import { baseUrl } from "@/lib/utils";

const INITIAL_PAGE = 1;
const PAGE_SIZE = 30;

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  gridColumns: number;
  targetUser: PublicProfile;
  currentUser?: PublicProfile;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

export default function BlockchainGroups(props: Props) {
  const [filters] = useCosmoFilters();
  const usingFilters = useMemo(() => filtersAreDirty(filters), [filters]);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const { artist } = useUserState();
  const isDesktop = useMediaQuery();

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

  // allow for artist filter, but default to selected artist
  const artistName = filters.artist ?? artist;

  /**
   * Query options
   */
  const options = objektOptions({
    filtering: "remote",
    queryKey: [
      "collection",
      "blockchain-groups",
      props.targetUser.address,
      artistName,
    ],
    queryFunction: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const endpoint = new URL(
        `/api/bff/v1/objekt/collection-group/${props.targetUser.address}`,
        baseUrl()
      ).toString();

      const searchParams = new URLSearchParams(props.searchParams);

      // add required params
      searchParams.set("page", pageParam.toString());
      searchParams.set("size", PAGE_SIZE.toString());
      searchParams.set("artistName", artistName);

      // remap sort param to order
      if (searchParams.has("sort")) {
        searchParams.set("order", searchParams.get("sort") ?? "newest");
        searchParams.delete("sort");
      }

      return await ofetch<BFFCollectionGroupResponse>(endpoint, {
        query: Object.fromEntries(searchParams.entries()),
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
        <p className="font-semibold">{total.toLocaleString("en")} types</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
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
            getObjektId={(item) => item.collection.collectionId}
            authenticated={props.authenticated}
            gridColumns={gridColumns}
            hidePins={hidePins}
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
