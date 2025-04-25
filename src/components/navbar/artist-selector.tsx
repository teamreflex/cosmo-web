import { getArtistsWithMembers, getSelectedArtists } from "@/app/data-fetching";
import ArtistSelectbox from "./artist-selectbox";

export default async function ArtistSelector() {
  const selected = await getSelectedArtists();
  const artists = getArtistsWithMembers();

  return <ArtistSelectbox artists={artists} selected={selected} />;
}
