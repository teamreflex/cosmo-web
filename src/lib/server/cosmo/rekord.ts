import {
  CosmoRekordArchiveStatus,
  CosmoRekordPost,
  CosmoRekordTopPost,
  RekordParams,
} from "@/lib/universal/cosmo/rekord";
import { cosmo } from "../http";
import { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * Fetch rekord posts.
 */
export async function fetchPosts(token: string, filters: RekordParams) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post", {
    query: filters,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch top rekord posts.
 */
export async function fetchTopPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordTopPost[]>("/rekord/v1/post/top", {
    query: {
      artistName: artist,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch archived rekord posts.
 * TODO: filtering
 */
export async function fetchArchivedPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post/archived", {
    query: {
      artistName: artist,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch archived rekord status.
 */
export async function fetchArchivedStatus(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordArchiveStatus>(
    `/rekord/v1/post/archived/${artist}/status`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Fetch archived rekord posts.
 * TODO: filtering
 */
export async function fetchMyPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post/owned", {
    query: {
      artistName: artist,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Like a post.
 */
export async function likePost(token: string, postId: number) {
  return await cosmo(`/rekord/v1/post/${postId}/like`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(() => true)
    .catch(() => false);
}

/**
 * Unlike a post.
 */
export async function unlikePost(token: string, postId: number) {
  return await cosmo(`/rekord/v1/post/${postId}/like`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(() => false)
    .catch(() => true);
}
