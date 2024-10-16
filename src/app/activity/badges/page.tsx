import { decodeUser } from "@/app/data-fetching";
import BadgeList from "@/components/activity/badge-list";
import { fetchActivityBadges } from "@/lib/server/cosmo/activity";
import { getSelectedArtist } from "@/lib/server/profiles";
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
  const queryClient = new QueryClient();

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
