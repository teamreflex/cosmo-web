import { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  decodeUser,
  getArtistsWithMembers,
  getProfile,
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

type Props = {
  searchParams: Promise<Record<string, string>>;
  params: Promise<{
    nickname: string;
    list: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { objektList } = await getData(params.nickname, params.list);
  if (!objektList) redirect(`/@${params.nickname}`);

  return {
    title: objektList.name,
  };
}

export default async function ObjektListPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  // get de-duplicated profile
  const { profile } = await getUserByIdentifier(params.nickname);

  // parse search params
  const filters = parseObjektList(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  // prefetch list
  const queryClient = getQueryClient();
  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "objekt-list",
      params.list,
      "blockchain",
      parseObjektListFilters(filters),
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) =>
      prefetchObjektList({
        slug: params.list,
        address: profile.address,
        filters: {
          ...filters,
          page: pageParam,
        },
      }).then((r) => r.results),
    initialPageParam: 0,
  });

  const { artists, currentUser, objektList } = await getData(
    params.nickname,
    params.list
  );
  if (!objektList) redirect(`/@${params.nickname}`);

  const authenticated =
    currentUser !== undefined && currentUser.address === profile.address;

  return (
    <ProfileProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ListRenderer
          artists={artists}
          list={objektList}
          authenticated={authenticated}
          user={profile}
          gridColumns={currentUser?.gridColumns ?? GRID_COLUMNS}
        />
      </HydrationBoundary>
    </ProfileProvider>
  );
}

const getData = cache(async (nickname: string, list: string) => {
  const user = await decodeUser();
  const { profile } = await getUserByIdentifier(nickname);

  const [artists, currentUser, objektList] = await Promise.all([
    getArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
    fetchObjektList(profile.address, list),
  ]);

  return { artists, currentUser, objektList };
});
