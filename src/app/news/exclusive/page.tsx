import NewsExclusiveInfiniteLoader from "@/components/news/news-exclusive-infinite-loader";
import { decodeUser, getProfile } from "../../data-fetching";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusives",
};

export default async function NewsExclusivePage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsExclusiveInfiniteLoader artist={profile.artist} />
    </main>
  );
}
