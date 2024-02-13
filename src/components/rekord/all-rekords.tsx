"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import RekordGrid from "./rekord-grid";
import { ofetch } from "ofetch";
import { RekordResponse } from "@/lib/universal/cosmo/rekord";
import { Fragment } from "react";
import { RekordMemberImage, RekordPost } from "./rekord-post";

type Props = {
  artist: ValidArtist;
};

export default function AllRekords({ artist }: Props) {
  async function queryFunction({ pageParam = 0 }: { pageParam?: number }) {
    return await ofetch<RekordResponse>(`/api/rekord/v1/post`, {
      query: {
        artistName: artist,
        fromPostId: pageParam === 0 ? undefined : pageParam.toString(),
        includeFromPost: false,
        seekDirection: "before_than",
        limit: 30,
        sort: "desc",
      },
    });
  }

  return (
    <RekordGrid
      queryKey={["all-rekords", artist]}
      queryFunction={queryFunction}
    >
      {({ post }) => (
        <RekordPost post={post} className="max-w-64 border border-accent">
          <RekordMemberImage post={post} className="absolute top-2 left-2" />
          <span className="absolute z-20 text-sm font-semibold bottom-2 left-2">
            {post.owner.nickname}
          </span>
        </RekordPost>
      )}
    </RekordGrid>
  );
}
