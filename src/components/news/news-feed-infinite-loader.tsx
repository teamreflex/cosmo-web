"use client";

import {
  CosmoBFFNewsFeedItem,
  CosmoBFFNewsFeedResult,
} from "@/lib/universal/cosmo/news";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";
import BFFNewsPostFeed from "./bff/bff-news-post-feed";
import BFFNewsInfiniteLoader from "./bff/bff-news-infinite-loader";

type Props = {
  artist: ValidArtist;
};

export default function NewsFeedInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 1 }: { pageParam?: string | number }) {
    return await ofetch<CosmoBFFNewsFeedResult<CosmoBFFNewsFeedItem>>(
      "/api/bff/v1/news/feed",
      {
        query: {
          artistName: artist,
          page: pageParam.toString(),
        },
      }
    );
  }

  function generatePost(post: CosmoBFFNewsFeedItem) {
    return <BFFNewsPostFeed key={post.data.id} post={post} />;
  }

  return (
    <BFFNewsInfiniteLoader
      fetcher={fetcher}
      component={generatePost}
      queryKey="news-feed"
      artist={artist}
    />
  );
}
