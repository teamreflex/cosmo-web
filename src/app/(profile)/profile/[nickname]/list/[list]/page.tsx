import { Metadata } from "next";
import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import ObjektListLoading from "./loading";
import {
  decodeUser,
  getArtistsWithMembers,
  getProfile,
  getUserByIdentifier,
} from "@/app/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { parseObjektList } from "@/lib/universal/parsers";
import {
  parseObjektListFilters,
  fetchObjektList as prefetchObjektList,
} from "@/lib/server/objekts/prefetching/objekt-list";
import { fetchObjektList } from "@/lib/server/objekts/lists";

type Props = {
  searchParams: Record<string, string>;
  params: {
    nickname: string;
    list: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { objektList } = await getData(params.nickname, params.list);
  if (!objektList) redirect(`/@${params.nickname}`);

  return {
    title: objektList.name,
  };
}

export default async function ObjektListPage({ params, searchParams }: Props) {
  // get de-duplicated profile
  const { profile } = await getUserByIdentifier(params.nickname);

  // parse search params
  const filters = parseObjektList(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  // load data
  const queryClient = new QueryClient();
  const [{ artists, currentUser, objektList }] = await Promise.all([
    getData(params.nickname, params.list),
    // prefetch data
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
    }),
  ]);

  if (!objektList) redirect(`/@${params.nickname}`);

  const authenticated =
    currentUser !== undefined && currentUser.address === profile.address;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ObjektListLoading />}>
        <ListRenderer
          artists={artists}
          list={objektList}
          authenticated={authenticated}
          user={profile}
          gridColumns={currentUser?.gridColumns}
        />
      </Suspense>
    </HydrationBoundary>
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
