"use client";

import {
  CosmoNewsFeedResult,
  CosmoNewsSectionExclusiveContent,
} from "@/lib/universal/cosmo/news";
import NewsInfiniteLoader from "./news-infinite-loader";
import NewsPostExclusive from "./news-post-exclusive";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";

type Props = {
  artist: ValidArtist;
};

export default function NewsExclusiveInfiniteLoader({ artist }: Props) {
  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const url = `${COSMO_ENDPOINT}/news/v1/exclusive`;
    return await ofetch<CosmoNewsFeedResult<CosmoNewsSectionExclusiveContent>>(
      url,
      {
        query: {
          artist,
          startAfter: pageParam.toString(),
        },
      }
    );
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
