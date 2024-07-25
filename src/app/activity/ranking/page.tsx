import AccountHistory from "@/components/activity/account-history";
import { getSelectedArtist } from "@/lib/server/profiles";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranking · Activity",
};

export default function ActivityRankingPage() {
  const artist = getSelectedArtist();

  return <AccountHistory artist={artist} />;
}
