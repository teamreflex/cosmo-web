"use client";

import { CosmoNewsSectionExclusiveContent } from "@/lib/universal/cosmo/news";
import Image from "next/image";
import Link from "next/link";
import Timestamp from "../ui/timestamp";
import { LuClipboardCopy } from "react-icons/lu";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "../ui/use-toast";
import { lazy, Suspense } from "react";
import Skeleton from "../skeleton/skeleton";

const HLSVideo = lazy(() => import("../misc/hls-video"));

export default function NewsPostExclusive({
  post,
}: {
  post: CosmoNewsSectionExclusiveContent;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {post.nativeVideoUrl === null ? (
        <ExclusiveLinkPost post={post} />
      ) : (
        <ExclusiveVideoPost post={post} />
      )}
      <div className="flex flex-col">
        <p className="font-bold flex justify-between items-center">
          {post.title}
          {post.nativeVideoUrl !== null && (
            <CopyVideoLink link={post.nativeVideoUrl} />
          )}
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
  if (post.nativeVideoUrl === null) return null;

  return (
    <div className="cursor-pointer relative aspect-video rounded-xl border border-accent overflow-hidden">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <HLSVideo
          videoUrl={post.nativeVideoUrl}
          thumbnailUrl={post.thumbnailImageUrl}
          title={post.title}
        />
      </Suspense>
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
      <LuClipboardCopy className="w-6 h-6" />
    </button>
  );
}
