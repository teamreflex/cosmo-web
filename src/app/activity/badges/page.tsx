import { decodeUser, getSelectedArtist } from "@/app/data-fetching";
import BadgeList from "@/components/activity/badge-list";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchActivityBadgeFilters,
  fetchActivityBadges,
} from "@/lib/server/cosmo/badges";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Badges · Activity",
};

export default async function ActivityBadgesPage() {
  const [user, artist] = await Promise.all([decodeUser(), getSelectedArtist()]);

  const queryClient = getQueryClient();

  // prefetch data
  queryClient.prefetchInfiniteQuery({
    queryKey: ["badges", artist, "all", undefined],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchActivityBadges(user!.accessToken, {
        artistId: artist,
        skip: pageParam,
        lang: "en",
      });
    },
    initialPageParam: 0,
  });

  const filters = await fetchActivityBadgeFilters(user!.accessToken);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BadgeList artist={artist} filters={filters} />
    </HydrationBoundary>
  );
}
