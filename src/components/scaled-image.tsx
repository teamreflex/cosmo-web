"use client";

import { cn, type PropsWithClassName } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type Props = PropsWithClassName<{
  src: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
  unoptimized?: boolean;
}>;

export default function ScaledImage({
  src,
  alt,
  priority = false,
  width = 16,
  height = 9,
  unoptimized = false,
  className,
}: Props) {
  const [ratio, setRatio] = useState({ width, height });

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${ratio.width} / ${ratio.height}` }}
    >
      <Image
        src={src}
        alt={alt}
        fill={true}
        priority={priority}
        quality={100}
        className={cn("object-cover", className)}
        unoptimized={unoptimized}
        onLoad={(e) =>
          setRatio({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          })
        }
      />
    </div>
  );
}
