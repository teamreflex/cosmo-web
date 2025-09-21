import type { Metadata } from "next";
import {
  getCurrentAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "../../data-fetching";
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
import { ArtistProvider } from "@/hooks/use-artists";
import { getTypesenseResults } from "@/lib/client/typesense";
import { UserStateProvider } from "@/hooks/use-user-state";

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

  const [session, searchParams, selected, artists] = await Promise.all([
    getSession(),
    props.searchParams,
    getSelectedArtists(),
    getArtistsWithMembers(),
  ]);

  // parse search params
  const params = new URLSearchParams({
    ...searchParams,
    sort: searchParams.sort ?? "newest",
  });
  for (const artist of selected) {
    params.append("artists", artist);
  }
  const filters = parseObjektIndex(params);
  const search = params.get("search");
  const parsedFilters = parseObjektIndexFilters(filters);

  // prefetch objekts
  if (search) {
    // prefetch typesense
    queryClient.prefetchInfiniteQuery({
      queryKey: [
        "objekt-index",
        "typesense",
        { search: search || null },
        {
          ...parsedFilters,
          artists: selected,
        },
      ],
      queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
        return await getTypesenseResults({
          query: search,
          filters: {
            ...parsedFilters,
            artist: filters.artist ?? null,
            member: filters.member ?? null,
          },
          page: pageParam,
          artists: selected,
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
          ...parsedFilters,
          artists: selected,
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

  const account = await getCurrentAccount(session?.session.userId);

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ArtistProvider artists={artists} selected={selected}>
          <ProfileProvider objektLists={account?.objektLists ?? []}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <IndexRenderer
                activeSlug={searchParams.id}
                objektLists={account?.objektLists ?? []}
              />
            </HydrationBoundary>
          </ProfileProvider>
        </ArtistProvider>
      </UserStateProvider>
    </main>
  );
}
