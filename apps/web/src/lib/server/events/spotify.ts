import { ofetch } from "ofetch";
import type {
  SpotifyAlbum,
  SpotifySearchResponse,
} from "@/lib/universal/events";
import { env } from "@/lib/env/server";
import { redis } from "@/lib/server/cache";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_KEY = "spotify:access_token";

type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

/**
 * Gets a Spotify access token.
 */
export async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token in Redis
  const cached = await redis.get(SPOTIFY_TOKEN_KEY);
  if (cached) {
    return cached;
  }

  const credentials = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const data = await ofetch<SpotifyToken>(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    },
  );

  // Cache the token in Redis with a 5-minute buffer before expiry
  const ttl = data.expires_in - 60 * 5;
  await redis.setex(SPOTIFY_TOKEN_KEY, ttl, data.access_token);

  return data.access_token;
}

/**
 * Searches for albums on Spotify.
 */
export async function searchSpotifyAlbums(
  query: string,
  limit = 10,
): Promise<SpotifyAlbum[]> {
  const token = await getAccessToken();
  const data = await ofetch<SpotifySearchResponse>(
    `${SPOTIFY_API_URL}/search`,
    {
      query: {
        q: query,
        type: "album",
        limit: limit.toString(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return data.albums.items;
}

/**
 * Gets a Spotify album.
 */
export async function fetchSpotifyAlbum(
  albumId: string,
): Promise<SpotifyAlbum | null> {
  const token = await getAccessToken();
  try {
    return await ofetch<SpotifyAlbum>(`${SPOTIFY_API_URL}/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Get the best album art URL (largest available)
 */
export function getBestAlbumArt(album: SpotifyAlbum): string | null {
  if (album.images.length === 0) return null;

  // Images are sorted by size, largest first
  return album.images[0]?.url ?? null;
}
