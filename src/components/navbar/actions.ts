import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { putCookie } from "@/lib/server/cookies";
import { fetchSelectedArtists } from "@/lib/queries/core";

/**
 * Set the selected artists in a cookie.
 */
export const setSelectedArtist = createServerFn({ method: "POST" })
  .inputValidator((data) => z.string().parse(data))
  .handler(async ({ data }) => {
    const artists = await fetchSelectedArtists();

    let selected = [...artists];
    if (artists.includes(data)) {
      selected = artists.filter((a) => a !== data);
    } else {
      selected.push(data);
    }

    putCookie({
      key: "artists",
      value: selected,
    });

    return selected;
  });
