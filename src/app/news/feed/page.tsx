import NewsFeedInfiniteLoader from "@/components/news/news-feed-infinite-loader";
import { decodeUser, getProfile } from "../../data-fetching";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function NewsFeedPage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsFeedInfiniteLoader artist={profile.artist} />
    </main>
  );
}
