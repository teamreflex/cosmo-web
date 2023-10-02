import NewsExclusiveInfiniteLoader from "@/components/news/news-exclusive-infinite-loader";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { fetchSelectedArtist } from "../../data-fetching";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusives",
};

export default async function NewsExclusivePage() {
  const user = await readToken(cookies().get("token")?.value);
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsExclusiveInfiniteLoader artist={selectedArtist ?? "artms"} />
    </main>
  );
}
