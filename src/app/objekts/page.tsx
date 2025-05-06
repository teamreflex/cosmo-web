import { Metadata } from "next";
import { getArtistsWithMembers, getSelectedArtists } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { ProfileProvider } from "@/hooks/use-profile";
import {
  fetchObjektsIndex,
  parseObjektIndexFilters,
} from "@/lib/server/objekts/prefetching/objekt-index";
import { parseObjektIndex } from "@/lib/universal/parsers";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { GRID_COLUMNS } from "@/lib/utils";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { getTypesenseResults } from "@/lib/client/typesense";

export const metadata: Metadata = {
  title: "Objekts",
};

type Params = {
  searchParams: Promise<Record<string, string>>;
};

export default async function ObjektsIndexPage(props: Params) {
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const [searchParams, selectedArtists, artists] = await Promise.all([
    props.searchParams,
    getSelectedArtists(),
    getArtistsWithMembers(),
  ]);

  // parse search params
  const params = new URLSearchParams({
    ...searchParams,
    sort: searchParams.sort ?? "newest",
  });
  for (const artist of selectedArtists) {
    params.append("artists", artist);
  }
  const filters = parseObjektIndex(params);

  const search = params.get("search");

  // prefetch objekts
  if (search) {
    // prefetch typesense
    queryClient.prefetchInfiniteQuery({
      queryKey: [
        "objekt-index",
        "typesense",
        { search: search || null },
        {
          ...parseObjektIndexFilters(filters),
          artists: selectedArtists,
        },
      ],
      queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
        return await getTypesenseResults({
          query: search,
          filters: {
            ...filters,
            artist: filters.artist ?? null,
            member: filters.member ?? null,
            transferable: null,
            gridable: null,
            used_for_grid: null,
            collection: null,
          },
          page: pageParam,
          artists: selectedArtists,
        });
      },
      initialPageParam: 1,
    });
  } else {
    // prefetch blockchain
    queryClient.prefetchInfiniteQuery({
      queryKey: [
        "objekt-index",
        "blockchain",
        {
          ...parseObjektIndexFilters(filters),
          artists: selectedArtists,
        },
      ],
      queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
        return fetchObjektsIndex({
          ...filters,
          page: pageParam,
        });
      },
      initialPageParam: 0,
    });
  }

  return (
    <main className="container flex flex-col py-2">
      <SelectedArtistsProvider selectedArtists={selectedArtists ?? []}>
        <CosmoArtistProvider artists={artists}>
          <ProfileProvider currentProfile={undefined} objektLists={[]}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <IndexRenderer
                artists={artists}
                objektLists={[]}
                nickname={undefined}
                gridColumns={GRID_COLUMNS}
                activeSlug={searchParams.id}
              />
            </HydrationBoundary>
          </ProfileProvider>
        </CosmoArtistProvider>
      </SelectedArtistsProvider>
    </main>
  );
}
