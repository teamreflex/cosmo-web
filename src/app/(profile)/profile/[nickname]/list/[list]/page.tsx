import { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getTargetAccount,
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
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { ArtistProvider } from "@/hooks/use-artists";

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
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const [artists, selected, searchParams, { nickname, list }] =
    await Promise.all([
      getArtistsWithMembers(),
      getSelectedArtists(),
      props.searchParams,
      props.params,
    ]);

  // get current and target accouonts
  const [account, { target, objektList }] = await Promise.all([
    getAccount(),
    getData(nickname, list),
  ]);

  if (!objektList) {
    redirect(`/@${nickname}`);
  }

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
        address: target.cosmo.address,
        filters: {
          ...filters,
          page: pageParam,
        },
      }).then((r) => r.results),
    initialPageParam: 0,
  });

  return (
    <ArtistProvider artists={artists} selected={selected}>
      <ProfileProvider account={account} target={target}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ListRenderer
            list={objektList}
            authenticated={account?.user !== undefined}
          />
        </HydrationBoundary>
      </ProfileProvider>
    </ArtistProvider>
  );
}

const getData = cache(async (nickname: string, list: string) => {
  const target = await getTargetAccount(nickname);
  const objektList = target.user
    ? await fetchObjektList(target.user.id, list)
    : undefined;

  return {
    target,
    objektList,
  };
});
