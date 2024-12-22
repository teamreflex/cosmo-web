"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import RekordGrid from "./rekord-grid";
import { ofetch } from "ofetch";
import {
  CosmoRekordListItem,
  RekordResponse,
} from "@/lib/universal/cosmo/rekord";
import { RekordPost } from "./rekord-post";
import { LuHeart } from "react-icons/lu";
import { format } from "date-fns";

type Props = {
  artist: ValidArtist;
};

export default function MyRekords({ artist }: Props) {
  async function queryFunction({ pageParam = 0 }: { pageParam?: number }) {
    return await ofetch<RekordResponse<CosmoRekordListItem>>(
      `/api/rekord/v1/post/owned`,
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
    <RekordGrid queryKey={["my-rekords", artist]} queryFunction={queryFunction}>
      {({ item }) => (
        <RekordPost item={item} className="max-w-64 border border-accent">
          <div className="absolute w-full h-12 bg-linear-to-t from-transparent to-black/30" />
          <Likes count={item.post.totalLikeCount} />
          <Timestamp createdAt={item.post.createdAt} />
        </RekordPost>
      )}
    </RekordGrid>
  );
}

function Likes({ count }: { count: number }) {
  return (
    <div className="absolute top-2 left-2 flex gap-2 items-center">
      <LuHeart className="h-4 w-4 fill-foreground" />
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}

function Timestamp({ createdAt }: { createdAt: string }) {
  return (
    <span className="absolute z-20 bottom-2 left-2 bg-background rounded px-2 py-px text-xs">
      {format(new Date(createdAt), "yy.MM.dd")}
    </span>
  );
}
