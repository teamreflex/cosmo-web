import { PropsWithChildren, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
}>;

/**
 * Flips on click.
 * Used for:
 * - Inside a MetadataDialog
 * - Upon grid reward
 * - When scanning an objekt
 */
export default function FlippableObjekt({ children, collection }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      data-flipped={flipped}
      onClick={() => setFlipped((prev) => !prev)}
      className={cn(
        "relative bg-accent w-full aspect-photocard cursor-pointer object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-lg md:rounded-xl lg:rounded-2xl"
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        <Image
          src={collection.frontImage}
          fill={true}
          alt={collection.collectionId}
        />
        {children}
      </div>

      {/* back */}
      <div className="absolute inset-0 backface-hidden rotate-y-180">
        <Image
          src={collection.backImage}
          fill={true}
          alt={collection.collectionId}
        />
      </div>
    </div>
  );
}
