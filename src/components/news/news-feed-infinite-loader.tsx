"use client";

import {
  CosmoNewsFeedResult,
  CosmoNewsSectionFeedContent,
} from "@/lib/universal/cosmo/news";
import NewsInfiniteLoader from "./news-infinite-loader";
import NewsPostFeed from "./news-post-feed";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";

type Props = {
  artist: ValidArtist;
};

export default function NewsFeedInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const url = `${COSMO_ENDPOINT}/news/v1/feed`;
    return await ofetch<CosmoNewsFeedResult<CosmoNewsSectionFeedContent>>(url, {
      query: {
        artist,
        startAfter: pageParam.toString(),
      },
    });
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
