import { Metadata } from "next";
import {
  getAccount,
  getArtistsWithMembers,
  getSelectedArtists,
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
import { ArtistProvider } from "@/hooks/use-artists";
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

  const [searchParams, selected, artists] = await Promise.all([
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

  const account = await getAccount().then((a) => ({
    user: a?.user,
    cosmo: a?.cosmo,
    objektLists: a?.objektLists ?? [],
  }));

  return (
    <main className="container flex flex-col py-2">
      <ArtistProvider artists={artists} selected={selected}>
        <ProfileProvider account={account}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <IndexRenderer activeSlug={searchParams.id} />
          </HydrationBoundary>
        </ProfileProvider>
      </ArtistProvider>
    </main>
  );
}
