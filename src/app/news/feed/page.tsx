import NewsFeedInfiniteLoader from "@/components/news/news-feed-infinite-loader";
import { decodeUser, fetchSelectedArtist } from "../../data-fetching";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function NewsFeedPage() {
  const user = await decodeUser();
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsFeedInfiniteLoader artist={selectedArtist ?? "artms"} />
    </main>
  );
}
