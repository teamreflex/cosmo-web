import { getSelectedArtist } from "@/app/data-fetching";
import NewsFeedInfiniteLoader from "@/components/news/news-feed-infinite-loader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function NewsFeedPage() {
  const artist = await getSelectedArtist();

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsFeedInfiniteLoader artist={artist} />
    </main>
  );
}
