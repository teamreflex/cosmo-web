import { decodeUser, getArtistsWithMembers } from "@/app/data-fetching";
import TopRanking from "@/components/activity/ranking/top-ranking";
import {
  fetchActivityRankingNear,
  fetchActivityRankingTop,
} from "@/lib/server/cosmo/activity";
import { getSelectedArtist } from "@/lib/server/profiles";
import { CosmoActivityRankingKind } from "@/lib/universal/cosmo/activity/ranking";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranking · Activity",
};

const kind: CosmoActivityRankingKind = "hold_objekts_per_season";

export default async function ActivityRankingPage() {
  const queryClient = new QueryClient();
  const artist = getSelectedArtist();

  const user = await decodeUser();
  const [artists] = await Promise.all([
    getArtistsWithMembers(),

    // prefetch my rank
    queryClient.prefetchQuery({
      queryKey: ["activity-ranking", artist, kind, "0"],
      queryFn: async () => {
        return fetchActivityRankingNear(user!.accessToken, {
          artistName: artist,
          kind,
          marginAbove: 1,
          marginBefore: 1,
        });
      },
    }),

    // prefetch top 10
    queryClient.prefetchQuery({
      queryKey: ["ranking-detail", artist, kind, "0"],
      queryFn: async () => {
        return fetchActivityRankingTop(user!.accessToken, {
          artistName: artist,
          kind,
          size: 10,
        });
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopRanking selectedArtist={artist} artists={artists} />
    </HydrationBoundary>
  );
}
