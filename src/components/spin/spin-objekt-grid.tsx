import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useUserState } from "@/hooks/use-user-state";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { ofetch } from "ofetch";
import { useCallback } from "react";
import { useProfileContext } from "@/hooks/use-profile";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import VirtualizedGrid from "@/components/objekt/virtualized-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import LoaderRemote from "@/components/objekt/loader-remote";
import SpinGroupedObjekt from "../objekt/objekt-spin-group";

const INITIAL_PAGE = 1;
const PAGE_SIZE = 30;

type Props = {
  currentUser: PublicProfile;
  searchParams: URLSearchParams;
  showLocked: boolean;
};

export default function SpinObjektGrid(props: Props) {
  const [filters] = useCosmoFilters();
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);
  const { artist, token } = useUserState();
  const { artists, getMember } = useCosmoArtists();
  const isDesktop = useMediaQuery();

  const gridColumns = isDesktop ? props.currentUser.gridColumns : 3;

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

  // handle missing token, should never happen here
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <p className="text-sm font-semibold">
          Please sign in to view your collection
        </p>
      </div>
    );
  }

  /**
   * Query options
   */
  const options = objektOptions({
    filtering: "remote",
    queryKey: ["collection-spin", props.currentUser.address, artist],
    queryFunction: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const endpoint = new URL(
        "/bff/v1/objekt/collection-group",
        COSMO_ENDPOINT
      ).toString();

      const searchParams = new URLSearchParams(props.searchParams);

      // add required params
      searchParams.set("tid", crypto.randomUUID());
      searchParams.set("page", pageParam.toString());
      searchParams.set("size", PAGE_SIZE.toString());
      searchParams.set("artistName", artist);
      searchParams.set("transferable", "true");

      // remap sort param to order
      if (searchParams.has("sort")) {
        searchParams.set("order", searchParams.get("sort") ?? "newest");
        searchParams.delete("sort");
      }

      // remap member name to id
      if (filters.member) {
        const member = getMember(filters.member);
        if (member) {
          searchParams.set("artistName", member.artistId);
          searchParams.set("memberIds", member.id.toString());
        }
        searchParams.delete("member");
      }

      // remap on_offline to online,offline as cosmo rejects offline,online
      if (filters.on_offline?.length === 2) {
        searchParams.set("on_offline", "online,offline");
      }

      return await ofetch<BFFCollectionGroupResponse>(endpoint, {
        query: Object.fromEntries(searchParams.entries()),
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
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
        <p className="font-semibold">{total.toLocaleString("en")} types</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.collections),
  });

  return (
    <FilteredObjektDisplay artists={artists} gridColumns={gridColumns}>
      <LoaderRemote
        options={options}
        hidePins={true}
        shouldRender={shouldRender}
        gridColumns={gridColumns}
      >
        {({ rows, hidePins }) => (
          <VirtualizedGrid
            rows={rows}
            getObjektId={(item) => item.collection.collectionId}
            authenticated={true}
            gridColumns={gridColumns}
            hidePins={hidePins}
          >
            {({ item, priority }) => (
              <SpinGroupedObjekt
                group={item}
                gridColumns={props.currentUser.gridColumns}
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
