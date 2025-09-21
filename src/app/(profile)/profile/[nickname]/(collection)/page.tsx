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
import {
  parseUserCollection,
  parseUserCollectionGroups,
} from "@/lib/universal/parsers";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchObjektsBlockchain,
  parseUserCollectionFilters,
} from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { fetchPins } from "@/lib/server/objekts/pins";
import { UserStateProvider } from "@/hooks/use-user-state";
import {
  fetchObjektsBlockchainGroups,
  parseUserCollectionGroupsFilters,
} from "@/lib/server/objekts/prefetching/objekt-blockchain-groups";
import { Addresses, isEqual } from "@/lib/utils";

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
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const [searchParams, routeParams, artists, session, selected] =
    await Promise.all([
      props.searchParams,
      props.params,
      getArtistsWithMembers(),
      getSession(),
      getSelectedArtists(),
    ]);

  const { nickname } = routeParams;

  const [account, target, pins] = await Promise.all([
    getCurrentAccount(session?.session.userId),
    getTargetAccount(nickname),
    fetchPins(nickname),
  ]);

  const params = new URLSearchParams(searchParams);
  for (const artist of selected) {
    params.append("artists", artist);
  }

  // if the user is in collection groups mode, prefetch the collection groups
  if (
    account?.user.collectionMode === "blockchain-groups" &&
    !isEqual(target.cosmo.address, Addresses.SPIN)
  ) {
    params.set("order", searchParams.sort ?? "newest");
    const filters = parseUserCollectionGroups(params);
    queryClient.prefetchInfiniteQuery({
      queryKey: [
        "collection",
        "blockchain-groups",
        target.cosmo.address,
        {
          ...parseUserCollectionGroupsFilters(filters),
          artist: filters.artistName,
          artists: selected,
        },
      ],
      queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
        return fetchObjektsBlockchainGroups(target.cosmo.address, {
          ...filters,
          page: pageParam,
        });
      },
      initialPageParam: 1,
    });
  } else {
    // if the user is a guest or is in blockchain mode, prefetch the objekts
    params.set("sort", searchParams.sort ?? "newest");
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
  }

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
