"use server";

import { getCookie, setCookie } from "@/lib/server/cookies";
import { revalidatePath } from "next/cache";

/**
 * Set the selected artists in a cookie.
 */
export async function setSelectedArtist(artist: string) {
  const artists = await getCookie<string[]>("artists");

  let selected = [];
  if (!artists) {
    selected.push(artist);
  } else {
    if (artists.includes(artist)) {
      selected = artists.filter((a) => a !== artist);
    } else {
      selected = [...artists, artist];
    }
  }

  await setCookie({
    key: "artists",
    value: selected,
  });

  revalidatePath("/");
}
