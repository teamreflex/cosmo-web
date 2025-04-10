import "server-only";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

/**
 * Fetch an artist.
 */
export async function fetchArtistBff(artistName: ValidArtist, token: string) {
  return await cosmo<CosmoArtistWithMembersBFF>(
    `/bff/v3/artists/${artistName}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
