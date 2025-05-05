import { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getUserByIdentifier,
} from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { parseObjektList } from "@/lib/universal/parsers";
import {
  parseObjektListFilters,
  fetchObjektList as prefetchObjektList,
} from "@/lib/server/objekts/prefetching/objekt-list";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { getQueryClient } from "@/lib/query-client";
import { ProfileProvider } from "@/hooks/use-profile";
import { GRID_COLUMNS } from "@/lib/utils";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";

type Props = {
  searchParams: Promise<Record<string, string>>;
  params: Promise<{
    nickname: string;
    list: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const objektList = await getData(params.nickname, params.list);
  if (!objektList) redirect(`/@${params.nickname}`);

  return {
    title: objektList.name,
  };
}

export default async function ObjektListPage(props: Props) {
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const [searchParams, { nickname, list }] = await Promise.all([
    props.searchParams,
    props.params,
  ]);

  // get de-duplicated profile
  const [selectedArtists, { profile }] = await Promise.all([
    getSelectedArtists(),
    getUserByIdentifier(nickname),
  ]);

  // parse search params
  const filters = parseObjektList(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  // prefetch list
  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "objekt-list",
      list,
      "blockchain",
      parseObjektListFilters(filters),
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) =>
      prefetchObjektList({
        slug: list,
        address: profile.address,
        filters: {
          ...filters,
          page: pageParam,
        },
      }).then((r) => r.results),
    initialPageParam: 0,
  });

  const artists = getArtistsWithMembers();
  const objektList = await getData(nickname, list);
  if (!objektList) redirect(`/@${nickname}`);

  return (
    <CosmoArtistProvider artists={artists}>
      <SelectedArtistsProvider selected={selectedArtists}>
        <ProfileProvider>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <ListRenderer
              list={objektList}
              authenticated={false}
              user={profile}
              gridColumns={GRID_COLUMNS}
            />
          </HydrationBoundary>
        </ProfileProvider>
      </SelectedArtistsProvider>
    </CosmoArtistProvider>
  );
}

const getData = cache(async (nickname: string, list: string) => {
  const { profile } = await getUserByIdentifier(nickname);
  return await fetchObjektList(profile.address, list);
});
