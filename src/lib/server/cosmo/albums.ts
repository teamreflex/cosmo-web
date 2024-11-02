import "server-only";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";
import { CosmoAlbum, CosmoAlbumWithTracks } from "@/lib/universal/cosmo/albums";

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
 * Fetch a single album.
 */
export async function fetchAlbum(token: string, albumHid: string) {
  return await cosmo<CosmoAlbumWithTracks>(`/bff/v3/albums/${albumHid}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Get an album by its QR code.
 */
export async function fetchAlbumByQrCode(token: string, code: string) {
  return await cosmo<CosmoAlbumWithTracks>(
    `/bff/v3/objekt-music-album-qr-codes/album`,
    {
      query: {
        n: code,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Claim an album via its QR code.
 */
export async function claimAlbum(token: string, code: string) {
  return await cosmo<CosmoAlbumWithTracks>(
    `/bff/v3/objekt-music-album-qr-codes/claim`,
    {
      method: "POST",
      query: {
        n: code,
      },
      body: {
        "Accept-Language": "en",
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Get an album's download URLs.
 */
export async function fetchAlbumDownload(token: string, albumHid: string) {
  return await cosmo<CosmoAlbumWithTracks>(
    `/bff/v3/albums/${albumHid}/track/download-authorize`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
