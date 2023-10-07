import NewsFeedInfiniteLoader from "@/components/news/news-feed-infinite-loader";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { fetchSelectedArtist } from "../../data-fetching";
import { Metadata } from "next";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Feed",
};

export default async function NewsFeedPage() {
  const user = await readToken(cookies().get("token")?.value);
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return (
    <main className="flex flex-col items-center container py-2">
      <NewsFeedInfiniteLoader artist={selectedArtist ?? "artms"} />
    </main>
  );
}
