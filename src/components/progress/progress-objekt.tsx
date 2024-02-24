import { ObjektProgression } from "@/lib/universal/progress";
import Image from "next/image";
import ObjektSidebar from "../objekt/objekt-sidebar";
import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

type Props = {
  objekt: ObjektProgression;
};

export default function ProgressObjekt({ objekt }: Props) {
  const css = {
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <div
      style={css}
      className={cn(
        "relative touch-manipulation",
        objekt.obtained === false && "opacity-50"
      )}
    >
      <Image
        src={objekt.frontImage}
        width={291}
        height={450}
        alt={objekt.collectionNo}
        quality={100}
        priority={false}
        loading="lazy"
        unoptimized
      />

      <ObjektSidebar collection={objekt.collectionNo} />
    </div>
  );
}
