import { getSelectedArtist } from "@/app/data-fetching";
import NewsExclusiveInfiniteLoader from "@/components/news/news-exclusive-infinite-loader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusives",
};

export default async function NewsExclusivePage() {
  const artist = await getSelectedArtist();

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsExclusiveInfiniteLoader artist={artist} />
    </main>
  );
}
