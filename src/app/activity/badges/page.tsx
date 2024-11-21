import { decodeUser, getSelectedArtist } from "@/app/data-fetching";
import BadgeList from "@/components/activity/badge-list";
import { getQueryClient } from "@/lib/query-client";
import { fetchActivityBadges } from "@/lib/server/cosmo/activity";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Badges · Activity",
};

export default async function ActivityBadgesPage() {
  const user = await decodeUser();
  const artist = await getSelectedArtist();
  const queryClient = getQueryClient();

  // prefetch data
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["activity-badges", artist],
    queryFn: async () => {
      return fetchActivityBadges(user!.accessToken, {
        artistName: artist,
        page: 1,
        pageSize: 30,
      });
    },
    initialPageParam: 1,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BadgeList artist={artist} />
    </HydrationBoundary>
  );
}
