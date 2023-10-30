import NewsExclusiveInfiniteLoader from "@/components/news/news-exclusive-infinite-loader";
import { decodeUser, fetchSelectedArtist } from "../../data-fetching";
import { Metadata } from "next";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Exclusives",
};

export default async function NewsExclusivePage() {
  const user = await decodeUser();
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsExclusiveInfiniteLoader artist={selectedArtist ?? "artms"} />
    </main>
  );
}
