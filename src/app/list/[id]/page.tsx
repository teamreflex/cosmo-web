import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import {
  getCurrentAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "@/data-fetching";
import ListRenderer from "@/components/lists/list-renderer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { parseObjektList } from "@/lib/universal/parsers";
import {
  parseObjektListFilters,
  fetchObjektList as prefetchObjektList,
} from "@/lib/server/objekts/prefetching/objekt-list";
import { getQueryClient } from "@/lib/query-client";
import { ProfileProvider } from "@/hooks/use-profile";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { ArtistProvider } from "@/hooks/use-artists";
import { UserStateProvider } from "@/hooks/use-user-state";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";
import { sanitizeUuid } from "@/lib/utils";
import { db } from "@/lib/server/db";

type Props = {
  searchParams: Promise<Record<string, string>>;
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const objektList = await getObjektListWithUser(params.id);
  if (!objektList) notFound();

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

  const [session, artists, selected, searchParams, { id }] = await Promise.all([
    getSession(),
    getArtistsWithMembers(),
    getSelectedArtists(),
    props.searchParams,
    props.params,
  ]);

  // get current account and list
  const [listData, account] = await Promise.all([
    getObjektListWithUser(id),
    getCurrentAccount(session?.session.userId),
  ]);
  if (!listData) notFound();

  const { user, ...objektList } = listData;

  // if the user has a cosmo linked, redirect to the profile page
  const cosmo = user?.cosmoAccount?.username;
  if (cosmo !== undefined) {
    redirect(`/@${cosmo}/list/${objektList.slug}`);
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

  const authenticated = session?.session.userId === objektList.userId;

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ArtistProvider artists={artists} selected={selected}>
          <ProfileProvider>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <div className="grid grid-cols-2 grid-rows-2 lg:grid-rows-1 lg:h-9">
                <div className="flex items-center">
                  <h3 className="text-xl font-cosmo leading-none">
                    {objektList.name}
                  </h3>
                </div>

                <div className="lg:flex flex-row items-center justify-end gap-2 row-span-2 lg:row-span-1 grid grid-rows-subgrid">
                  <span className="row-start-2 ml-auto" id="objekt-total" />
                  {authenticated && (
                    <div className="flex items-center gap-2">
                      <UpdateList objektList={objektList} />
                      <DeleteList objektList={objektList} />
                    </div>
                  )}
                </div>

                <div
                  className="h-10 flex items-center lg:hidden"
                  id="filters-button"
                />
              </div>

              <ListRenderer
                authenticated={authenticated}
                objektList={objektList}
              />
            </HydrationBoundary>
          </ProfileProvider>
        </ArtistProvider>
      </UserStateProvider>
    </main>
  );
}

const getObjektListWithUser = cache(async (id: string) => {
  const sanitized = sanitizeUuid(id);
  if (!sanitized) {
    return undefined;
  }

  if (id !== sanitized) {
    redirect(`/list/${sanitized}`);
  }

  return await db.query.objektLists.findFirst({
    where: { id: sanitized },
    with: {
      user: {
        columns: {
          id: true,
        },
        with: {
          cosmoAccount: {
            columns: {
              username: true,
            },
          },
        },
      },
    },
  });
});
