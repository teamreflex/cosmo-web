import { getSelectedArtist } from "@/app/data-fetching";
import AccountHistory from "@/components/activity/account-history";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History · Activity",
};

export default async function ActivityHistoryPage() {
  const artist = await getSelectedArtist();

  return <AccountHistory artist={artist} />;
}
