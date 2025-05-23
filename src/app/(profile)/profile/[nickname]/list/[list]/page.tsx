import { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getCurrentAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
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
import { UserStateProvider } from "@/hooks/use-user-state";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";

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

  const [session, artists, selected, searchParams, { nickname, list }] =
    await Promise.all([
      getSession(),
      getArtistsWithMembers(),
      getSelectedArtists(),
      props.searchParams,
      props.params,
    ]);

  // get current and target accounts
  const [account, { target, objektList }] = await Promise.all([
    getCurrentAccount(session?.session.userId),
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
  if (target.user !== undefined) {
    queryClient.prefetchInfiniteQuery({
      queryKey: [
        "objekt-list",
        objektList.id,
        {
          ...parseObjektListFilters(filters),
          artists: selected,
        },
      ],
      queryFn: async ({ pageParam = 0 }) =>
        prefetchObjektList({
          id: objektList.id,
          filters: {
            ...filters,
            page: pageParam,
          },
        }).then((r) => r.results),
      initialPageParam: 0,
    });
  }

  const { objektLists, ...targetAccount } = target;
  const authenticated = account?.user?.id === objektList.userId;

  return (
    <UserStateProvider {...account}>
      <ArtistProvider artists={artists} selected={selected}>
        <ProfileProvider target={targetAccount} objektLists={objektLists}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-cosmo">{objektList.name}</h3>

              {authenticated && (
                <div className="flex items-center gap-2">
                  <UpdateList objektList={objektList} />
                  <DeleteList objektList={objektList} />
                </div>
              )}
            </div>

            <ListRenderer
              objektList={objektList}
              authenticated={authenticated}
            />
          </HydrationBoundary>
        </ProfileProvider>
      </ArtistProvider>
    </UserStateProvider>
  );
}

const getData = cache(async (nickname: string, list: string) => {
  const target = await getTargetAccount(nickname);
  const objektList = target.user
    ? await fetchObjektList({
        userId: target.user.id,
        slug: list,
      })
    : undefined;

  return {
    target,
    objektList,
  };
});
