"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

export default function ScaledImage({
  src,
  alt,
  priority = false,
  width = 16,
  height = 9,
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
        className="object-cover"
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
