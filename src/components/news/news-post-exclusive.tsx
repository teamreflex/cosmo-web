"use client";

import { CosmoNewsSectionExclusiveContent } from "@/lib/universal/cosmo/news";
import Image from "next/image";
import Link from "next/link";
import Timestamp from "../ui/timestamp";
import { Copy } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "../ui/use-toast";
import dynamic from "next/dynamic";

// gets around SSR hydration issues
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

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
        <p className="font-bold flex justify-between items-center">
          {post.title}
          {isVideoPost && <CopyVideoLink link={post.nativeVideoUrl} />}
        </p>
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
        config={{
          file: {
            forceSafariHLS: true,
            hlsVersion: "1.4.12",
          },
        }}
        light={
          <Image
            src={post.thumbnailImageUrl}
            alt={post.title}
            fill={true}
            className="object-contain"
            quality={100}
          />
        }
      />
    </div>
  );
}

function CopyVideoLink({ link }: { link: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyLink() {
    copy(link);
    toast({
      description: "M3U8 link copied to clipboard",
    });
  }

  return (
    <button className="flex items-center" onClick={() => copyLink()}>
      <Copy className="w-6 h-6" />
    </button>
  );
}
