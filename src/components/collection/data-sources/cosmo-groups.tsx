import FilteredObjektDisplay from "@/components/objekt/filtered-objekt-display";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useUserState } from "@/hooks/use-user-state";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { ofetch } from "ofetch";
import { useMemo } from "react";
import GroupedObjekt from "@/components/objekt/objekt-collection-group";

const INITIAL_PAGE = 1;
const PAGE_SIZE = 30;

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  profile: PublicProfile;
  user?: PublicProfile;
  searchParams: URLSearchParams;
};

export default function CosmoCollectionGroups(props: Props) {
  const { artist, token } = useUserState();
  const [filters] = useCosmoFilters();
  const usingFilters = useMemo(() => filtersAreDirty(filters), [filters]);

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
  const options = {
    queryKey: ["collection", "cosmo", props.profile.address, artist],
    queryFunction: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const endpoint = new URL(
        "/bff/v1/objekt/collection-group",
        COSMO_ENDPOINT
      ).toString();

      // remap sort param to order
      const searchParams = new URLSearchParams(props.searchParams);
      if (searchParams.has("sort")) {
        searchParams.set("order", searchParams.get("sort") ?? "newest");
        searchParams.delete("sort");
      }

      // add required params
      searchParams.set("tid", crypto.randomUUID());
      searchParams.set("page", pageParam.toString());
      searchParams.set("size", PAGE_SIZE.toString());
      searchParams.set("artistName", artist);

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
  } satisfies ObjektResponseOptions<
    BFFCollectionGroupResponse,
    BFFCollectionGroup
  >;

  const gridColumns = props.profile?.gridColumns ?? props.user?.gridColumns;

  return (
    <FilteredObjektDisplay
      artists={props.artists}
      options={options}
      getObjektId={(item) => item.collection.collectionId}
      gridColumns={gridColumns}
      hidePins={usingFilters}
      authenticated={props.authenticated}
    >
      {({ item }) => <GroupedObjekt group={item} gridColumns={gridColumns} />}
    </FilteredObjektDisplay>
  );
}
