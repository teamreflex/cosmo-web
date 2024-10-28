import "server-only";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { CosmoAlbum } from "@/lib/universal/cosmo/albums";

/**
 * Fetch a list of albums.
 */
export async function fetchAlbums(token: string, artistName: ValidArtist) {
  return await cosmo<CosmoAlbum[]>(`/bff/v3/albums`, {
    query: {
      artistName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Claim an album via its QR code.
 */
export async function claimAlbum(token: string, code: string) {
  return await cosmo<CosmoAlbum[]>(
    `/bff/v3/objekt-music-album-qr-codes/album`,
    {
      method: "POST",
      query: {
        n: code,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
