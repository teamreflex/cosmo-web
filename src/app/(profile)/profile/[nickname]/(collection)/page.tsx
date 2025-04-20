import { Metadata } from "next";
import {
  getUserByIdentifier,
  getSelectedArtist,
  getArtistsWithMembers,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { ProfileProvider } from "@/hooks/use-profile";
import { fetchPins } from "@/lib/server/objekts/pins";
import { UserStateProvider } from "@/hooks/use-user-state";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { parseUserCollection } from "@/lib/universal/parsers";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchObjektsPolygon,
  parseUserCollectionFilters,
} from "@/lib/server/objekts/prefetching/objekt-polygon";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

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
  const [searchParams, params, selectedArtist] = await Promise.all([
    props.searchParams,
    props.params,
    getSelectedArtist(),
  ]);

  const [artists, targetUser] = await Promise.all([
    getArtistsWithMembers(),
    getUserByIdentifier(params.nickname),
  ]);

  const queryClient = getQueryClient();
  const filters = parseUserCollection(
    new URLSearchParams({
      ...searchParams,
      sort: searchParams.sort ?? "newest",
    })
  );

  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "collection",
      "blockchain",
      targetUser.profile.address,
      parseUserCollectionFilters(filters),
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return fetchObjektsPolygon(targetUser.profile.address, {
        ...filters,
        page: pageParam,
      });
    },
    initialPageParam: 0,
  });

  const pins = await fetchPins(targetUser.pins);

  return (
    <CosmoArtistProvider artists={artists}>
      <ProfileProvider
        targetProfile={targetUser.profile}
        objektLists={targetUser.objektLists}
        lockedObjekts={targetUser.lockedObjekts}
        pins={pins}
      >
        <section className="flex flex-col">
          <UserStateProvider artist={selectedArtist} token={undefined}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProfileRenderer
                artists={artists}
                targetUser={targetUser.profile}
              />
            </HydrationBoundary>
          </UserStateProvider>
        </section>
      </ProfileProvider>
    </CosmoArtistProvider>
  );
}
