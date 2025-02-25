import { Metadata } from "next";
import {
  decodeUser,
  getArtistsWithMembers,
  getUserByIdentifier,
} from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
import { ProfileProvider } from "@/hooks/use-profile";
import {
  fetchObjektsIndex,
  parseObjektIndexFilters,
} from "@/lib/server/objekts/prefetching/objekt-index";
import { parseObjektIndex } from "@/lib/universal/parsers";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { GRID_COLUMNS } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Objekts",
};

type Params = {
  searchParams: Promise<Record<string, string>>;
};

export default async function ObjektsIndexPage(props: Params) {
  const searchParams = await props.searchParams;
  const queryClient = getQueryClient();

  // parse search params
  const filters = parseObjektIndex(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  // prefetch objekts
  queryClient.prefetchInfiniteQuery({
    queryKey: ["objekt-index", "blockchain", parseObjektIndexFilters(filters)],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchObjektsIndex({
        ...filters,
        page: pageParam,
      });
    },
    initialPageParam: 0,
  });

  const user = await decodeUser();
  const [artists, data, collections] = await Promise.all([
    getArtistsWithMembers(),
    user ? getUserByIdentifier(user.address) : undefined,
    fetchUniqueCollections(),
  ]);

  const { profile, objektLists = [] } = data ?? {};

  return (
    <main className="container flex flex-col py-2">
      <ProfileProvider currentProfile={profile} objektLists={objektLists}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IndexRenderer
            artists={artists}
            collections={collections}
            objektLists={objektLists}
            nickname={user?.nickname}
            gridColumns={profile?.gridColumns ?? GRID_COLUMNS}
            activeSlug={searchParams.id}
          />
        </HydrationBoundary>
      </ProfileProvider>
    </main>
  );
}
