import { getArtistsWithMembers } from "@/app/data-fetching";
import { getCookie } from "@/lib/server/cookies";
import ArtistSelectbox from "./artist-selectbox";

export default async function ArtistSelector() {
  const selected = await getCookie<string[]>("artists");
  const artists = await getArtistsWithMembers();

  return <ArtistSelectbox artists={artists} selected={selected} />;
}
