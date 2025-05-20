import type { Metadata } from "next";
import {
  getCurrentAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
  getTargetAccount,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { ProfileProvider } from "@/hooks/use-profile";
import { ArtistProvider } from "@/hooks/use-artists";
import { parseUserCollection } from "@/lib/universal/parsers";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchObjektsBlockchain,
  parseUserCollectionFilters,
} from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { fetchPins } from "@/lib/server/objekts/pins";
import { UserStateProvider } from "@/hooks/use-user-state";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
  searchParams: Promise<Record<string, string>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { cosmo } = await getTargetAccount(params.nickname);

  return {
    title: `${cosmo.username}'s Collection`,
  };
}

export default async function UserCollectionPage(props: Props) {
  const artists = getArtistsWithMembers();
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const [session, searchParams, { nickname }, selected] = await Promise.all([
    getSession(),
    props.searchParams,
    props.params,
    getSelectedArtists(),
  ]);

  const [account, target, pins] = await Promise.all([
    getCurrentAccount(session?.session.userId),
    getTargetAccount(nickname),
    fetchPins(nickname),
  ]);

  const params = new URLSearchParams({
    ...searchParams,
    sort: searchParams.sort ?? "newest",
  });
  for (const artist of selected) {
    params.append("artists", artist);
  }
  const filters = parseUserCollection(params);

  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "collection",
      "blockchain",
      target.cosmo.address,
      {
        ...parseUserCollectionFilters(filters),
        artists: selected,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchObjektsBlockchain(target.cosmo.address, {
        ...filters,
        page: pageParam,
      });
    },
    initialPageParam: 0,
  });

  const { objektLists, lockedObjekts, ...targetAccount } = target;

  return (
    <UserStateProvider {...account}>
      <ArtistProvider artists={artists} selected={selected}>
        <ProfileProvider
          target={targetAccount}
          pins={targetAccount.user ? pins : []}
          lockedObjekts={targetAccount.user ? lockedObjekts : []}
          objektLists={objektLists}
        >
          <section className="flex flex-col">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProfileRenderer targetCosmo={target.cosmo} />
            </HydrationBoundary>
          </section>
        </ProfileProvider>
      </ArtistProvider>
    </UserStateProvider>
  );
}
