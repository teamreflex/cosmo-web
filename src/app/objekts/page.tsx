import { Metadata } from "next";
import { decodeUser, getProfile } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
import { fetchObjektLists } from "@/lib/server/objekts/lists";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { ProfileProvider } from "@/hooks/use-profile";
import {
  fetchObjektsIndex,
  parseObjektIndexFilters,
} from "@/lib/server/objekts/fetch";
import { parseObjektIndex } from "@/lib/universal/parsers";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

export const metadata: Metadata = {
  title: "Objekts",
};

type Params = {
  searchParams: Record<string, string>;
};

export default async function ObjektsIndexPage({ searchParams }: Params) {
  const queryClient = new QueryClient();
  const filters = parseObjektIndex(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  const queryKey = [
    "objekt-index",
    "blockchain",
    parseObjektIndexFilters(filters),
  ];
  const queryFn = async ({ pageParam = 0 }: { pageParam?: number }) => {
    return fetchObjektsIndex({
      ...filters,
      page: pageParam,
    });
  };

  const user = await decodeUser();
  const [currentUser, objektLists, artists, collections, firstPage] =
    await Promise.all([
      user ? getProfile(user.profileId) : undefined,
      user ? fetchObjektLists(user.address) : undefined,
      fetchArtistsWithMembers(),
      fetchUniqueCollections(),
      queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn,
        initialPageParam: 0,
      }),
    ]);

  return (
    <main className="container flex flex-col py-2">
      <ProfileProvider profile={currentUser}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IndexRenderer
            artists={artists}
            collections={collections}
            objektLists={objektLists}
            nickname={user?.nickname}
            gridColumns={currentUser?.gridColumns}
          />
        </HydrationBoundary>
      </ProfileProvider>
    </main>
  );
}
