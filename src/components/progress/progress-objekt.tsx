import { ObjektProgression } from "@/lib/universal/progress";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { replaceUrlSize } from "../objekt/common";
import { ObjektSidebar } from "../objekt/common";
import { Star } from "lucide-react";

type Props = {
  objekt: ObjektProgression;
};

export default function ProgressObjekt({ objekt }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);

  const image = replaceUrlSize(objekt.frontImage, "thumbnail");

  return (
    <div
      style={{ "--objekt-text-color": objekt.textColor }}
      className={cn(
        "relative touch-manipulation",
        objekt.obtained === false && "opacity-50"
      )}
    >
      <Image
        onLoad={() => setIsLoaded(true)}
        className={cn("transition-opacity", isLoaded === false && "opacity-0")}
        src={image}
        width={291}
        height={450}
        alt={objekt.collectionNo}
        quality={100}
      />

      {objekt.unobtainable && (
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black rounded-full p-1">
          <Star className="size-4 fill-white text-white" />
        </div>
      )}

      {isLoaded && <ObjektSidebar collection={objekt.collectionNo} />}
    </div>
  );
}
