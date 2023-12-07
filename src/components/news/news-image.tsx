"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
};

export default function NewsImage({ src, alt }: Props) {
  const [ratio, setRatio] = useState({ width: 16, height: 9 });

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${ratio.width} / ${ratio.height}` }}
    >
      <Image
        src={src}
        alt={alt}
        fill={true}
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
