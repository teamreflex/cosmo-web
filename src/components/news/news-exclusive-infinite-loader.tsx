"use client";

import {
  CosmoNewsFeedResult,
  CosmoNewsSectionExclusiveContent,
  ValidArtist,
} from "@/lib/server/cosmo";
import NewsInfiniteLoader from "./news-infinite-loader";
import NewsPostExclusive from "./news-post-exclusive";

type Props = {
  artist: ValidArtist;
};

export default function NewsExclusiveInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 0 }) {
    const searchParams = new URLSearchParams({
      artist,
      startAfter: pageParam.toString(),
    });

    const result = await fetch(
      `/api/news/v1/exclusive?${searchParams.toString()}`
    );
    return (await result.json()) as CosmoNewsFeedResult<CosmoNewsSectionExclusiveContent>;
  }

  function generatePost(post: CosmoNewsSectionExclusiveContent) {
    return <NewsPostExclusive key={post.id} post={post} />;
  }

  return <NewsInfiniteLoader fetcher={fetcher} component={generatePost} />;
}
