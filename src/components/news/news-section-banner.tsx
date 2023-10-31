"use client";

import {
  CosmoNewsSectionBanner,
  CosmoNewsSectionBannerContent,
} from "@/lib/server/cosmo";
import Image from "next/image";
import Link from "next/link";
import { AspectRatio } from "../ui/aspect-ratio";
import { PropsWithClassName } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Route } from "next";

type Props = {
  section: CosmoNewsSectionBanner;
};

export default function NewsSectionBanner({ section }: Props) {
  const [carousel] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);

  return (
    <div
      className="flex flex-col w-full md:w-1/2 py-4 overflow-x-hidden"
      ref={carousel}
    >
      <div className="embla__container flex w-full h-full">
        {section.contents
          .sort((a, b) => a.order - b.order)
          .map((item, i, arr) => (
            <BannerItem
              className="embla__slide mx-4"
              key={item.id}
              item={item}
              index={i + 1}
              total={arr.length}
            />
          ))}
      </div>
    </div>
  );
}

type BannerItemProps = PropsWithClassName<{
  item: CosmoNewsSectionBannerContent;
  index: number;
  total: number;
}>;

function BannerItem({ className, item, index, total }: BannerItemProps) {
  return (
    <Link href={item.url as Route} target="_blank" className={className}>
      <div className="relative aspect-video w-full rounded-xl border border-accent overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.body}
          fill={true}
          className="object-cover"
          quality={100}
          priority={true}
        />

        <div className="absolute bottom-0 left-0 w-full flex h-20 bg-gradient-to-t from-background/90 to-transparent" />

        <span className="absolute bottom-3 left-3 flex flex-col gap-2">
          <span className="bg-background/75 border border-foreground/50 p-1 text-xs rounded-lg w-fit capitalize">
            {item.label}
          </span>
          <p className="font-bold text-base md:text-lg">{item.body}</p>
        </span>

        <span className="absolute bottom-3 right-3 bg-background/25 text-xs rounded-full px-2 py-1">
          {index}/{total}
        </span>
      </div>
    </Link>
  );
}
