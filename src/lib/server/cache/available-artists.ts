import "server-only";
import { fetchArtist, fetchArtists } from "../cosmo/artists";
import { remember } from "./common";
import { validArtists } from "@/lib/universal/cosmo/common";

export async function cacheArtists() {
  return await remember("available-artists", 60 * 60, fetchArtists);
}

export async function cacheMembers() {
  return await remember("artists-members", 60 * 60, () =>
    Promise.all(validArtists.map((artist) => fetchArtist(artist)))
  );
}
