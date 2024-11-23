"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import {
  CosmoRekordArchiveItem,
  CosmoRekordPost,
  RekordResponse,
} from "@/lib/universal/cosmo/rekord";
import { ofetch } from "ofetch";
import RekordGrid from "./rekord-grid";
import { RekordMemberImage, RekordPost } from "./rekord-post";
import { Disc3, Heart } from "lucide-react";
import { ordinal } from "@/lib/utils";
import { format } from "date-fns";

type Props = {
  artist: ValidArtist;
};

export default function ArchiveRekords({ artist }: Props) {
  async function queryFunction({ pageParam = 0 }: { pageParam?: number }) {
    return await ofetch<RekordResponse<CosmoRekordArchiveItem>>(
      `/api/rekord/v1/post/archived`,
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
      gridClasses="grid-cols-1 gap-4 justify-center justify-items-center items-center"
      queryKey={["rekord-archive", artist]}
      queryFunction={queryFunction}
    >
      {({ item }) => (
        <RekordPost
          item={item}
          className="w-full max-w-96 border border-accent"
          showStatus={false}
        >
          <div className="absolute w-full h-16 bg-linear-to-t from-transparent to-black/50" />

          <Rank rank={item.archiveNo} />
          <User post={item.post} />
          <Likes count={item.post.totalLikeCount} />
        </RekordPost>
      )}
    </RekordGrid>
  );
}

function Rank({ rank }: { rank: number }) {
  return (
    <span className="absolute top-2 left-2 flex gap-2 items-center text-sm font-semibold">
      <Disc3 />
      <p>{ordinal(rank)} Archive</p>
    </span>
  );
}

function Likes({ count }: { count: number }) {
  return (
    <div className="absolute bottom-2 right-2 flex gap-2 items-center">
      <Heart className="h-4 w-4 fill-foreground" />
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}

function User({ post }: { post: CosmoRekordPost }) {
  const timestamp = format(new Date(post.createdAt), "yy.MM.dd");

  return (
    <div className="absolute bottom-2 left-2 flex flex-col gap-1">
      <RekordMemberImage post={post} showName />
      <span className="text-sm font-semibold">
        by {post.owner.nickname} · {timestamp}
      </span>
    </div>
  );
}
