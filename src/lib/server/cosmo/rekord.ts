import {
  CosmoRekordArchiveItem,
  CosmoRekordArchiveStatus,
  CosmoRekordListItem,
  CosmoRekordPost,
  CosmoRekordTopItem,
  RekordParams,
} from "@/lib/universal/cosmo/rekord";
import { cosmo } from "../http";
import { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * Fetch rekord posts.
 * Map into {@link CosmoRekordListItem} to maintain a consistent interface.
 */
export async function fetchPosts(
  token: string,
  filters: RekordParams
): Promise<CosmoRekordListItem[]> {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post", {
    query: filters,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((items) => items.map((item) => ({ post: item })));
}

/**
 * Fetch top rekord posts.
 */
export async function fetchTopPosts(token: string, artist: ValidArtist) {
  return await cosmo<CosmoRekordTopItem[]>("/rekord/v1/post/top", {
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
 */
export async function fetchArchivedPosts(token: string, filters: RekordParams) {
  return await cosmo<CosmoRekordArchiveItem[]>("/rekord/v1/post/archived", {
    query: filters,
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
 * Map into {@link CosmoRekordListItem} to maintain a consistent interface.
 */
export async function fetchMyPosts(
  token: string,
  filters: RekordParams
): Promise<CosmoRekordListItem[]> {
  return await cosmo<CosmoRekordPost[]>("/rekord/v1/post/owned", {
    query: filters,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((items) => items.map((item) => ({ post: item })));
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
