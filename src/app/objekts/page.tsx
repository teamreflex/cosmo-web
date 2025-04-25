import { Metadata } from "next";
import { getArtistsWithMembers, getSelectedArtists } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
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

export const metadata: Metadata = {
  title: "Objekts",
};

type Params = {
  searchParams: Promise<Record<string, string>>;
};

export default async function ObjektsIndexPage(props: Params) {
  const selectedArtists = await getSelectedArtists();
  const searchParams = await props.searchParams;
  const queryClient = getQueryClient();

  // parse search params
  const params = new URLSearchParams({
    ...searchParams,
    sort: searchParams.sort ?? "newest",
  });
  for (const artist of selectedArtists) {
    params.append("artists", artist);
  }
  const filters = parseObjektIndex(params);

  // prefetch objekts
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

  const artists = getArtistsWithMembers();
  const collections = await fetchUniqueCollections();

  return (
    <main className="container flex flex-col py-2">
      <SelectedArtistsProvider selectedArtists={selectedArtists ?? []}>
        <ProfileProvider currentProfile={undefined} objektLists={[]}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <IndexRenderer
              artists={artists}
              collections={collections}
              objektLists={[]}
              nickname={undefined}
              gridColumns={GRID_COLUMNS}
              activeSlug={searchParams.id}
            />
          </HydrationBoundary>
        </ProfileProvider>
      </SelectedArtistsProvider>
    </main>
  );
}
