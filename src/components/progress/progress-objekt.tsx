import { ObjektProgression } from "@/lib/universal/progress";
import Image from "next/image";
import ObjektSidebar from "../objekt/objekt-sidebar";
import { cn } from "@/lib/utils";
import { CSSProperties, useState } from "react";
import { replaceUrlSize } from "../objekt/objekt-util";

type Props = {
  objekt: ObjektProgression;
};

export default function ProgressObjekt({ objekt }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);

  const css = {
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const image = replaceUrlSize(objekt.frontImage, "thumbnail");

  return (
    <div
      style={css}
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
        unoptimized
      />

      {isLoaded && <ObjektSidebar collection={objekt.collectionNo} />}
    </div>
  );
}
