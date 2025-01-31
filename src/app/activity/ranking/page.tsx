import {
  decodeUser,
  getArtistsWithMembers,
  getSelectedArtist,
} from "@/app/data-fetching";
import TopRanking from "@/components/activity/ranking/top-ranking";
import { getQueryClient } from "@/lib/query-client";
import {
  fetchActivityRankingLast,
  fetchActivityRankingNear,
  fetchActivityRankingTop,
} from "@/lib/server/cosmo/activity";
import { CosmoActivityRankingKind } from "@/lib/universal/cosmo/activity/ranking";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranking · Activity",
};

const kind: CosmoActivityRankingKind = "hold_objekts_per_season";

export default async function ActivityRankingPage() {
  const user = await decodeUser();
  const artist = await getSelectedArtist();

  const queryClient = getQueryClient();

  // prefetch last
  queryClient.prefetchQuery({
    queryKey: ["ranking", "last", artist, "0"],
    queryFn: async () => {
      return fetchActivityRankingLast(user!.accessToken, {
        artistId: artist,
      });
    },
  });

  // prefetch my rank
  queryClient.prefetchQuery({
    queryKey: ["ranking", "near", artist, kind, "0"],
    queryFn: async () => {
      return fetchActivityRankingNear(user!.accessToken, {
        artistId: artist,
        kind,
        marginAbove: 1,
        marginBefore: 1,
      });
    },
  });

  // prefetch top 10
  queryClient.prefetchQuery({
    queryKey: ["ranking", "top", artist, kind, "0"],
    queryFn: async () => {
      return fetchActivityRankingTop(user!.accessToken, {
        artistId: artist,
        kind,
        size: 10,
      });
    },
  });

  const artists = await getArtistsWithMembers();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopRanking key={artist} selectedArtist={artist} artists={artists} />
    </HydrationBoundary>
  );
}
