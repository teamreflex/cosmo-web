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

type Props = {
  section: CosmoNewsSectionRekord;
};

export default function NewsSectionRekord({ section }: Props) {
  const [carousel] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);

  if (section.contents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full md:w-1/2 py-4 overflow-x-hidden">
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
            .map((item, i, arr) => (
              <RekordPost
                className="embla__slide mx-4"
                key={item.id}
                item={item}
                index={i + 1}
                total={arr.length}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

type RekordPostProps = PropsWithClassName<{
  item: CosmoNewsSectionRekordContent;
  index: number;
  total: number;
}>;

function RekordPost({ className, item, index, total }: RekordPostProps) {
  return null;

  // return (
  //   <Link href={item.url} target="_blank" className={className}>
  //     <div className="relative w-full rounded-xl border border-accent overflow-hidden">
  //       <ScaledImage
  //         src={item.imageUrl}
  //         alt={item.body}
  //         priority={true}
  //         width={1920}
  //         height={1325}
  //       />

  //       <div className="absolute bottom-0 left-0 w-full flex h-20 bg-gradient-to-t from-background/90 to-transparent" />

  //       <span className="absolute bottom-3 left-3 flex flex-col gap-2">
  //         <span className="bg-background/75 border border-foreground/50 p-1 text-xs rounded-lg w-fit capitalize">
  //           {item.label}
  //         </span>
  //         <p className="font-bold text-base md:text-lg">{item.body}</p>
  //       </span>

  //       <span className="absolute bottom-3 right-3 bg-background/25 text-xs rounded-full px-2 py-1">
  //         {index}/{total}
  //       </span>
  //     </div>
  //   </Link>
  // );
}
