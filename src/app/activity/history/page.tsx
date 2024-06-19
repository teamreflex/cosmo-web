import AccountHistory from "@/components/activity/account-history";
import { getSelectedArtist } from "@/lib/server/profiles";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History · Activity",
};

export default function ActivityHistoryPage() {
  const artist = getSelectedArtist();

  return <AccountHistory artist={artist} />;
}
