import { useState } from "react";
import type { PropsWithChildren } from "react";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";

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
      role="button"
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      data-flipped={flipped}
      onClick={() => setFlipped((prev) => !prev)}
      className={cn(
        "relative bg-secondary w-full aspect-photocard object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-2xl",
        !flipped && "will-change-transform",
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        <img
          className="absolute"
          src={collection.frontImage}
          alt={collection.collectionId}
        />
        {children}
      </div>

      {/* back */}
      <div className="absolute inset-0 backface-hidden rotate-y-180">
        <img
          className="absolute"
          src={collection.backImage}
          alt={collection.collectionId}
        />
      </div>
    </div>
  );
}
