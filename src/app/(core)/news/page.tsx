import NewsSelectArtist from "@/components/news/news-artist-select";
import { LoadingNews } from "@/components/news/news-loading";
import NewsRenderer from "@/components/news/news-renderer";
import { fetchArtists, isValidArtist } from "@/lib/server/cosmo";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Suspense, cache } from "react";

type Props = {
  searchParams: {
    artist?: ValidArtist;
  };
};

const fetchAllArtists = cache(async () => await fetchArtists());

export default async function NewsPage({ searchParams }: Props) {
  const user = await readToken(cookies().get("token")?.value);

  if (!user) {
    return (
      <span className="flex justify-center w-full py-12">Please login!</span>
    );
  }

  const artists = await fetchAllArtists();
  if (!searchParams.artist) {
    return <NewsSelectArtist artists={artists} />;
  }

  // handle different artists
  let artist: ValidArtist = "artms";
  if (isValidArtist(searchParams.artist)) {
    artist = searchParams.artist;
  }

  return (
    <main className="flex flex-col items-center">
      <Suspense fallback={<LoadingNews artist={artist} />}>
        <NewsRenderer user={user} artist={artist} />
      </Suspense>
    </main>
  );
}
