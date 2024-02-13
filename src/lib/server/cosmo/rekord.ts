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
export async function fetchPosts(artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post", {
    query: {
      artistName: artist,
    },
  });
}

/**
 * Fetch top rekord posts.
 * Cached for 15 minutes.
 */
export async function fetchTopPosts(artist: ValidArtist) {
  return await cosmo<CosmoRekordTopPost>("/rekord/v1/post/top", {
    query: {
      artistName: artist,
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
export async function fetchArchivedPosts(artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post/archived", {
    query: {
      artistName: artist,
    },
  });
}

/**
 * Fetch archived rekord status.
 */
export async function fetchArchivedStatus(artist: ValidArtist) {
  return await cosmo<CosmoRekordArchiveStatus>(
    `/rekord/v1/post/archived/${artist}/status`
  );
}

/**
 * Fetch archived rekord posts.
 * TODO: filtering
 */
export async function fetchMyPosts(artist: ValidArtist) {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post/owned", {
    query: {
      artistName: artist,
    },
  });
}

/**
 * Like a post.
 */
export async function likePost(postId: number) {
  return await cosmo(`/rekord/v1/post/${postId}/like`, {
    method: "POST",
  })
    .then(() => true)
    .catch(() => false);
}

/**
 * Unlike a post.
 */
export async function unlikePost(postId: number) {
  return await cosmo(`/rekord/v1/post/${postId}/like`, {
    method: "DELETE",
  })
    .then(() => true)
    .catch(() => false);
}
