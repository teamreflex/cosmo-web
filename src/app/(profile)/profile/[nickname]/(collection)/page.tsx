import { Metadata } from "next";
import {
  getUserByIdentifier,
  getArtistsWithMembers,
  getSelectedArtists,
  getUserOrProfile,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { ProfileProvider } from "@/hooks/use-profile";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { parseUserCollection } from "@/lib/universal/parsers";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchObjektsBlockchain,
  parseUserCollectionFilters,
} from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import AddressFallback from "@/components/profile/address-fallback";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
  searchParams: Promise<Record<string, string>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const user = await getUserOrProfile(params.nickname);

  return {
    title: `${user.username}'s Collection`,
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

  const [searchParams, { nickname }] = await Promise.all([
    props.searchParams,
    props.params,
  ]);

  const [targetUser, selectedArtists] = await Promise.all([
    getUserOrProfile(nickname),
    getSelectedArtists(),
  ]);

  if (!targetUser.cosmoAddress) {
    return <AddressFallback username={targetUser.username} />;
  }

  const params = new URLSearchParams({
    ...searchParams,
    sort: searchParams.sort ?? "newest",
  });
  for (const artist of selectedArtists) {
    params.append("artists", artist);
  }
  const filters = parseUserCollection(params);

  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "collection",
      "blockchain",
      targetUser.cosmoAddress,
      {
        ...parseUserCollectionFilters(filters),
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchObjektsBlockchain(targetUser.cosmoAddress!, {
        ...filters,
        page: pageParam,
      });
    },
    initialPageParam: 0,
  });

  return (
    <CosmoArtistProvider artists={artists}>
      <SelectedArtistsProvider selected={selectedArtists}>
        <ProfileProvider targetUser={targetUser} objektLists={[]}>
          <section className="flex flex-col">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProfileRenderer targetUser={targetUser} />
            </HydrationBoundary>
          </section>
        </ProfileProvider>
      </SelectedArtistsProvider>
    </CosmoArtistProvider>
  );
}
