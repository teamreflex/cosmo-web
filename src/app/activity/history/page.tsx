import { decodeUser, getSelectedArtist } from "@/app/data-fetching";
import AccountHistory from "@/components/activity/account-history";
import { getQueryClient } from "@/lib/query-client";
import { fetchActivityHistory } from "@/lib/server/cosmo/activity";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History · Activity",
};

export default async function ActivityHistoryPage() {
  const [user, artist] = await Promise.all([decodeUser(), getSelectedArtist()]);

  const queryClient = getQueryClient();

  /**
   * default to current month
   * this will run on the server, so the client's date will be slightly off
   */
  const today = new Date();
  const timestamp = {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: new Date(),
  };

  // prefetch data
  queryClient.prefetchQuery({
    queryKey: ["activity-history", artist, "all", timestamp],
    queryFn: async () => {
      return fetchActivityHistory(user!.accessToken, {
        artistName: artist,
        historyType: "all",
        fromTimestamp: timestamp?.from?.toISOString() ?? "",
        toTimestamp: timestamp?.to?.toISOString() ?? "",
      });
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountHistory artist={artist} defaultTimestamp={timestamp} />
    </HydrationBoundary>
  );
}
