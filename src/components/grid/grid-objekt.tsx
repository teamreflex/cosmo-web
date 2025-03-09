import { PropsWithClassName, cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ObjektSidebar, replaceUrlSize } from "../objekt/common";

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
        <ObjektSidebar collection={collectionNo} serial={objektNo} />
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
