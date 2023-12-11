"use client";

import {
  CosmoNewsFeedResult,
  CosmoNewsSectionExclusiveContent,
} from "@/lib/universal/cosmo/news";
import NewsInfiniteLoader from "./news-infinite-loader";
import NewsPostExclusive from "./news-post-exclusive";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  artist: ValidArtist;
};

export default function NewsExclusiveInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const searchParams = new URLSearchParams({
      artist,
      startAfter: pageParam.toString(),
    });

    const result = await fetch(
      `${COSMO_ENDPOINT}/news/v1/exclusive?${searchParams.toString()}`
    );
    return (await result.json()) as CosmoNewsFeedResult<CosmoNewsSectionExclusiveContent>;
  }

  function generatePost(post: CosmoNewsSectionExclusiveContent) {
    return <NewsPostExclusive key={post.id} post={post} />;
  }

  return (
    <NewsInfiniteLoader
      fetcher={fetcher}
      component={generatePost}
      queryKey="news-exclusive"
      artist={artist}
    />
  );
}
