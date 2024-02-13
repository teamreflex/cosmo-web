"use client";

import {
  CosmoNewsSectionRekord,
  CosmoNewsSectionRekordContent,
} from "@/lib/universal/cosmo/news";
import Link from "next/link";
import { PropsWithClassName } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "../ui/button";
import { Disc3 } from "lucide-react";
import { RekordMemberImage, RekordPost } from "../rekord/rekord-post";

type Props = {
  section: CosmoNewsSectionRekord;
};

export default function NewsSectionRekord({ section }: Props) {
  const [carousel] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 10000, stopOnInteraction: false }),
  ]);

  if (section.contents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 pb-6 overflow-x-hidden">
      {/* header */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          <Disc3 className="w-6 h-6" />
          <h2 className="font-bold text-xl">Today&apos;s Rekord</h2>
        </div>

        <Button variant="cosmo" size="sm" asChild>
          <Link href="/rekord">View More</Link>
        </Button>
      </div>

      {/* post carousel */}
      <div className="flex flex-col w-full" ref={carousel}>
        <div className="embla__container flex w-full h-full">
          {section.contents
            .sort((a, b) => a.id - b.id)
            .map((item) => (
              <RekordPost key={item.id} post={item} className="w-24 max-w-24">
                <div className="absolute z-50 -bottom-4 left-0 w-full flex justify-center">
                  <RekordMemberImage post={item} />
                </div>
              </RekordPost>
            ))}
        </div>
      </div>
    </div>
  );
}
