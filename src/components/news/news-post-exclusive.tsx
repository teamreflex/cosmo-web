"use client";

import { CosmoNewsSectionExclusiveContent } from "@/lib/server/cosmo";
import Image from "next/image";
import Link from "next/link";
import Timestamp from "../ui/timestamp";
import ReactPlayer from "react-player";

export default function NewsPostExclusive({
  post,
}: {
  post: CosmoNewsSectionExclusiveContent;
}) {
  const isVideoPost = post.url.includes("update-notice");

  return (
    <div className="flex flex-col gap-2 w-full">
      {isVideoPost ? (
        <ExclusiveVideoPost post={post} />
      ) : (
        <ExclusiveLinkPost post={post} />
      )}
      <div className="flex flex-col">
        <p className="font-bold">{post.title}</p>
        <p className="text-sm">{post.body}</p>
        <p className="text-muted-foreground text-sm">
          <Timestamp timestamp={post.createdAt} />
        </p>
      </div>
    </div>
  );
}

function ExclusiveLinkPost({
  post,
}: {
  post: CosmoNewsSectionExclusiveContent;
}) {
  return (
    <Link
      href={post.url}
      target="_blank"
      className="relative aspect-video rounded-xl border border-accent overflow-hidden"
    >
      <Image
        src={post.thumbnailImageUrl}
        alt={post.title}
        fill={true}
        className="object-contain"
        quality={100}
      />
    </Link>
  );
}

function ExclusiveVideoPost({
  post,
}: {
  post: CosmoNewsSectionExclusiveContent;
}) {
  return (
    <div className="cursor-pointer relative aspect-video rounded-xl border border-accent overflow-hidden">
      <ReactPlayer
        url={post.nativeVideoUrl}
        controls={true}
        width="100%"
        height="100%"
        light={post.thumbnailImageUrl}
      />
    </div>
  );
}
