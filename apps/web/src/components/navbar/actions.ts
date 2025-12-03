import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { putCookie } from "@/lib/server/cookies";
import { $fetchSelectedArtists } from "@/lib/queries/core";

/**
 * Set the selected artists in a cookie.
 */
export const $setSelectedArtist = createServerFn({ method: "POST" })
  .inputValidator(z.object({ artist: z.string() }))
  .handler(async ({ data }) => {
    const artists = await $fetchSelectedArtists();

    let selected = [...artists];
    if (artists.includes(data.artist)) {
      selected = artists.filter((a) => a !== data.artist);
    } else {
      selected.push(data.artist);
    }

    putCookie({
      key: "artists",
      value: selected,
    });

    return selected;
  });
