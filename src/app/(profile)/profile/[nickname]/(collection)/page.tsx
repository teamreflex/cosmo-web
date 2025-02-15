import { Metadata } from "next";
import {
  decodeUser,
  getProfile,
  getUserByIdentifier,
  getSelectedArtist,
  getArtistsWithMembers,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { Shield } from "lucide-react";
import { isAddressEqual } from "@/lib/utils";
import { ProfileProvider } from "@/hooks/use-profile";
import { fetchPins } from "@/lib/server/objekts/pins";
import { UserStateProvider } from "@/hooks/use-user-state";
import Portal from "@/components/portal";
import RewardsAvailable from "@/components/rewards/rewards-available";
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
  const [searchParams, params, user, selectedArtist] = await Promise.all([
    props.searchParams,
    props.params,
    decodeUser(),
    getSelectedArtist(),
  ]);

  const [artists, currentUser, targetUser] = await Promise.all([
    getArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
    getUserByIdentifier(params.nickname),
  ]);

  const isOwnProfile =
    user !== undefined && isAddressEqual(user.nickname, params.nickname);

  if (targetUser.profile.privacy.objekts && !isOwnProfile) {
    return <Private nickname={targetUser.profile.nickname} />;
  }

  // prefetch collection when using blockchain data source
  const queryClient = getQueryClient();
  if (
    (isOwnProfile && currentUser?.dataSource === "blockchain") ||
    !isOwnProfile
  ) {
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
  }

  const pins = await fetchPins(targetUser.pins);

  return (
    <CosmoArtistProvider artists={artists}>
      <ProfileProvider
        currentProfile={currentUser}
        targetProfile={targetUser.profile}
        objektLists={targetUser.objektLists}
        lockedObjekts={targetUser.lockedObjekts}
        pins={pins}
      >
        <section className="flex flex-col">
          <UserStateProvider artist={selectedArtist} token={user}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProfileRenderer
                artists={artists}
                targetUser={targetUser.profile}
                currentUser={currentUser}
              />
            </HydrationBoundary>

            {/* needs token access */}
            {isOwnProfile === true && (
              <Portal to="#overlay">
                <RewardsAvailable />
              </Portal>
            )}
          </UserStateProvider>
        </section>
      </ProfileProvider>
    </CosmoArtistProvider>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s collection is private
      </p>
    </div>
  );
}
