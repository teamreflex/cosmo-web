import { Metadata } from "next";
import {
  getUserByIdentifier,
  getArtistsWithMembers,
  getSelectedArtists,
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
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
  searchParams: Promise<Record<string, string>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Collection`,
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
    getUserByIdentifier(nickname),
    getSelectedArtists(),
  ]);

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
      targetUser.profile.address,
      {
        ...parseUserCollectionFilters(filters),
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchObjektsBlockchain(targetUser.profile.address, {
        ...filters,
        page: pageParam,
      });
    },
    initialPageParam: 0,
  });

  return (
    <SelectedArtistsProvider selectedArtists={selectedArtists}>
      <CosmoArtistProvider artists={artists}>
        <ProfileProvider
          targetProfile={targetUser.profile}
          objektLists={targetUser.objektLists}
        >
          <section className="flex flex-col">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProfileRenderer
                artists={artists}
                targetUser={targetUser.profile}
              />
            </HydrationBoundary>
          </section>
        </ProfileProvider>
      </CosmoArtistProvider>
    </SelectedArtistsProvider>
  );
}
