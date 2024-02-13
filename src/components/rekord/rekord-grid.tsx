"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { RekordResponse } from "@/lib/universal/cosmo/rekord";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { Fragment } from "react";
import { RekordMemberImage, RekordPost } from "./rekord-post";

type Props = {
  artist: ValidArtist;
};

export default function RekordGrid({ artist }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["all-rekords", artist],
      queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
        return await ofetch<RekordResponse>(`/api/rekord/v1/post`, {
          query: {
            artistName: artist,
            fromPostId: pageParam === 0 ? undefined : pageParam.toString(),
            includeFromPost: false,
            seekDirection: "before_than",
            limit: 30,
            sort: "desc",
          },
          retry: false,
        });
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.fromPostId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-center">
      {status === "error" ? (
        <div>error</div>
      ) : (
        <Fragment>
          {data !== undefined &&
            data.pages.map((group, i) => (
              <Fragment key={i}>
                {group.results.map((post) => (
                  <RekordPost
                    key={post.id}
                    post={post}
                    className="max-w-64 border border-accent"
                  >
                    <RekordMemberImage
                      post={post}
                      className="absolute top-2 left-2"
                    />
                    <span className="absolute z-50 text-sm font-semibold bottom-2 left-2">
                      {post.owner.nickname}
                    </span>
                  </RekordPost>
                ))}
              </Fragment>
            ))}

          {hasNextPage && (
            <div className="flex col-span-full justify-center">
              <InfiniteQueryNext
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                status={status}
              />
            </div>
          )}
        </Fragment>
      )}
    </div>
  );
}
