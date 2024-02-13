import {
  CosmoRekordArchiveStatus,
  CosmoRekordPost,
  CosmoRekordTopPost,
} from "@/lib/universal/cosmo/rekord";
import { cosmo } from "../http";
import { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * Fetch rekord posts.
 * TODO: filtering
 */
export async function fetchPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post", {
    query: {
      artistName: artist,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Fetch top rekord posts.
 * Cached for 15 minutes.
 */
export async function fetchTopPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordTopPost[]>("/rekord/v1/post/top", {
    query: {
      artistName: artist,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: {
      tags: ["rekord", "top-posts"],
      revalidate: 60 * 15,
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
    .then(() => true)
    .catch(() => false);
}
