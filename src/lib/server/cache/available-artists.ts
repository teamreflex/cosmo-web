import { fetchArtist, fetchArtists, validArtists } from "../cosmo";
import { remember } from "./common";

export async function cacheArtists() {
  return await remember("available-artists", 60 * 60, fetchArtists);
}

export async function cacheMembers() {
  return await remember("artists-members", 60 * 60, () =>
    Promise.all(validArtists.map((artist) => fetchArtist(artist)))
  );
}