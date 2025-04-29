"use server";

import { getSelectedArtists } from "@/app/data-fetching";
import { setCookie } from "@/lib/server/cookies";

/**
 * Set the selected artists in a cookie.
 */
export async function setSelectedArtist(artist: string) {
  const artists = await getSelectedArtists();

  let selected = [...artists];
  if (artists.includes(artist)) {
    selected = artists.filter((a) => a !== artist);
  } else {
    selected.push(artist);
  }

  await setCookie({
    key: "artists",
    value: selected,
  });
}
