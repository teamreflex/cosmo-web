"use client";

import {
  CosmoNewsFeedResult,
  CosmoNewsSectionFeedContent,
} from "@/lib/universal/cosmo/news";
import NewsInfiniteLoader from "./news-infinite-loader";
import NewsPostFeed from "./news-post-feed";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  artist: ValidArtist;
};

export default function NewsFeedInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 0 }) {
    const searchParams = new URLSearchParams({
      artist,
      startAfter: pageParam.toString(),
    });

    const result = await fetch(
      `${COSMO_ENDPOINT}/news/v1/feed?${searchParams.toString()}`
    );
    return (await result.json()) as CosmoNewsFeedResult<CosmoNewsSectionFeedContent>;
  }

  function generatePost(post: CosmoNewsSectionFeedContent) {
    return <NewsPostFeed key={post.id} post={post} fullWidth={true} />;
  }

  return (
    <NewsInfiniteLoader
      fetcher={fetcher}
      component={generatePost}
      queryKey="news-feed"
      artist={artist}
    />
  );
}
