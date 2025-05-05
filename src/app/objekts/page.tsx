import { Metadata } from "next";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "../data-fetching";
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
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { toPublicUser } from "@/lib/server/auth";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import { fetchObjektLists } from "@/lib/server/objekts/lists";
import { ObjektList } from "@/lib/server/db/schema";

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

  const [searchParams, selectedArtists, artists, session] = await Promise.all([
    props.searchParams,
    getSelectedArtists(),
    getArtistsWithMembers(),
    getSession(),
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

  // fetch objekt lists
  const objektLists = session
    ? await fetchObjektLists(session.session.userId)
    : [];

  return (
    <main className="container flex flex-col py-2">
      <CosmoArtistProvider artists={artists}>
        <SelectedArtistsProvider selected={selectedArtists}>
          <ProfileProvider
            currentUser={toPublicUser(session?.user)}
            objektLists={objektLists}
          >
            <HydrationBoundary state={dehydrate(queryClient)}>
              <IndexRenderer activeSlug={searchParams.id} />
            </HydrationBoundary>
          </ProfileProvider>
        </SelectedArtistsProvider>
      </CosmoArtistProvider>
    </main>
  );
}
