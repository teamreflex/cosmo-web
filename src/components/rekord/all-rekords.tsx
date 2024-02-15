"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import RekordGrid from "./rekord-grid";
import { ofetch } from "ofetch";
import {
  CosmoRekordListItem,
  RekordResponse,
} from "@/lib/universal/cosmo/rekord";
import { RekordMemberImage, RekordPost } from "./rekord-post";

type Props = {
  artist: ValidArtist;
};

export default function AllRekords({ artist }: Props) {
  async function queryFunction({ pageParam = 0 }: { pageParam?: number }) {
    return await ofetch<RekordResponse<CosmoRekordListItem>>(
      `/api/rekord/v1/post`,
      {
        query: {
          artistName: artist,
          fromPostId: pageParam === 0 ? undefined : pageParam.toString(),
          includeFromPost: false,
          seekDirection: "before_than",
          limit: 30,
          sort: "desc",
        },
      }
    );
  }

  return (
    <RekordGrid
      queryKey={["all-rekords", artist]}
      queryFunction={queryFunction}
    >
      {({ item }) => (
        <RekordPost item={item} className="max-w-64 border border-accent">
          <RekordMemberImage
            post={item.post}
            className="absolute top-2 left-2"
          />
          <span className="absolute z-20 text-sm font-semibold bottom-2 left-2">
            {item.post.owner.nickname}
          </span>
        </RekordPost>
      )}
    </RekordGrid>
  );
}
