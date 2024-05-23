import { Metadata } from "next";
import { decodeUser, getProfileAndLists } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
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
  const [data, artists, collections] = await Promise.all([
    user ? getProfileAndLists(user.profileId) : undefined,
    fetchArtistsWithMembers(),
    fetchUniqueCollections(),
    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn,
      initialPageParam: 0,
    }),
  ]);

  const { profile, objektLists = [] } = data ?? {};

  return (
    <main className="container flex flex-col py-2">
      <ProfileProvider profile={profile}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IndexRenderer
            artists={artists}
            collections={collections}
            objektLists={objektLists}
            nickname={user?.nickname}
            gridColumns={profile?.gridColumns}
          />
        </HydrationBoundary>
      </ProfileProvider>
    </main>
  );
}
