import { useElementSize } from "@/hooks/use-element-size";
import { PropsWithClassName, cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { replaceUrlSize } from "../objekt/common";

type Props = PropsWithClassName<{
  image: string;
  collectionNo: string;
  objektNo: number;
  textColor: string;
  selected: boolean;
}>;

export default function GridObjekt({
  className,
  image,
  collectionNo,
  objektNo,
  textColor,
  selected,
}: Props) {
  const [isLoaded, setIsLoaded] = useState(false);

  const scaledImage = replaceUrlSize(image, "2x");

  return (
    <div
      style={{ "--objekt-text-color": textColor }}
      className={cn(
        "relative aspect-photocard w-full flex justify-center items-center bg-accent border-4 border-background rounded-2xl transition-colors",
        `text-(--objekt-text-color)`,
        selected && "border-cosmo",
        !isLoaded && "animate-pulse",
        className
      )}
    >
      <Image
        onLoad={() => setIsLoaded(true)}
        className={cn("transition-opacity", isLoaded === false && "opacity-0")}
        src={scaledImage}
        fill={true}
        alt={collectionNo}
        unoptimized
      />
      {isLoaded && (
        <GridObjektNumber collectionNo={collectionNo} objektNo={objektNo} />
      )}
      <div
        className={cn(
          "absolute top-1 left-1 bg-cosmo text-white rounded-full p-1 transition-all opacity-0",
          selected && "opacity-100"
        )}
      >
        <Check className="w-4 h-4" />
      </div>
    </div>
  );
}

function GridObjektNumber({
  collectionNo,
  objektNo,
}: {
  collectionNo: string;
  objektNo: number;
}) {
  const [ref, { width }] = useElementSize();

  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-(--objekt-text-color)"
      style={{ lineHeight: `${width}px`, fontSize: `${width * 0.55}px` }}
    >
      <span>{collectionNo}</span>
      <span>#{objektNo.toString().padStart(5, "0")}</span>
    </div>
  );
}
