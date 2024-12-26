import { useState, type CSSProperties } from "react";
import { CommonObjektProps } from "./common";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props extends Omit<CommonObjektProps, "id" | "serial"> {}

/**
 * Flips on click.
 * Used for:
 * - Inside a MetadataDialog
 * - Upon grid reward
 * - When scanning an objekt
 */
export default function FlippableObjekt({ children, objekt }: Props) {
  const [flipped, setFlipped] = useState(false);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <div
      style={css}
      data-flipped={flipped}
      onClick={() => setFlipped((prev) => !prev)}
      className={cn(
        "relative bg-accent w-full aspect-photocard cursor-pointer object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-lg md:rounded-xl lg:rounded-2xl"
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        <Image src={objekt.frontImage} fill={true} alt={objekt.collectionId} />
        {children}
      </div>

      {/* back */}
      <div className="absolute inset-0 backface-hidden rotate-y-180">
        <Image src={objekt.backImage} fill={true} alt={objekt.collectionId} />
      </div>
    </div>
  );
}
