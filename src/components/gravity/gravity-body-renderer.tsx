"use client";

import {
  CosmoBodyHeading,
  CosmoBodyImage,
  CosmoBodySpacing,
  CosmoBodyText,
  CosmoBodyVideo,
  CosmoGravity,
} from "@/lib/universal/cosmo/gravity";
import { cn } from "@/lib/utils";
import Image from "next/image";
import GravityEventType from "./gravity-event-type";
import { match } from "ts-pattern";
import { lazy, Suspense } from "react";
import Skeleton from "../skeleton/skeleton";

const HLSVideo = lazy(() => import("../misc/hls-video"));

type Props = {
  gravity: CosmoGravity;
};

export default function GravityBodyRenderer({ gravity }: Props) {
  return (
    <div className="flex flex-col w-full justify-center mb-4">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden">
        <Image
          className="absolute"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
          quality={100}
        />
        <h2 className="absolute w-full h-full text-2xl font-semibold top-0 left-0 bg-linear-to-t from-black/75 to-transparent p-3 flex items-end">
          {gravity.title}
        </h2>
      </div>

      <div className="flex flex-col gap-2 py-4">
        <GravityEventType type={gravity.type} />
        <p className="text-sm opacity-80">{gravity.description}</p>
      </div>

      {/* dynamic fragments */}
      {gravity.body.map((item, i) =>
        match(item)
          .with({ type: "heading" }, (item) => (
            <HeadingElement key={i} item={item} />
          ))
          .with({ type: "image" }, (item) => (
            <ImageElement key={i} item={item} />
          ))
          .with({ type: "spacing" }, (item) => (
            <SpacingElement key={i} item={item} />
          ))
          .with({ type: "text" }, (item) => <TextElement key={i} item={item} />)
          .with({ type: "video" }, (item) => (
            <VideoElement key={i} item={item} />
          ))
          .exhaustive()
      )}
    </div>
  );
}

function SpacingElement({ item }: { item: CosmoBodySpacing }) {
  return <div style={{ height: `${item.height}px` }} />;
}

function HeadingElement({ item }: { item: CosmoBodyHeading }) {
  return (
    <h2
      className={cn(
        "flex text-xl font-cosmo mb-2",
        item.align === "center" && "justify-center",
        item.align === "right" && "justify-end"
      )}
    >
      {item.text}
    </h2>
  );
}

function ImageElement({ item }: { item: CosmoBodyImage }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ height: `${item.height}px` }}
    >
      <Image src={item.imageUrl} fill={true} alt="gravity image" />
    </div>
  );
}

function TextElement({ item }: { item: CosmoBodyText }) {
  return (
    <span
      className={cn(
        "flex flex-col",
        item.align === "center" && "text-center",
        item.align === "right" && "text-end"
      )}
    >
      {item.text.split("\n").map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </span>
  );
}

function VideoElement({ item }: { item: CosmoBodyVideo }) {
  return (
    <div className="cursor-pointer relative aspect-video rounded-xl border border-accent overflow-hidden">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <HLSVideo
          videoUrl={item.videoUrl}
          thumbnailUrl={item.thumbnailImageUrl}
        />
      </Suspense>
    </div>
  );
}
