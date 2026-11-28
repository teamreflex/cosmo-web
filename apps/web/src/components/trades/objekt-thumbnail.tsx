import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * The objekt's front at thumbnail size, or a muted card of the same size
 * when the indexer has lost it or the image fails to load. `className` sets
 * its width.
 */
export default function ObjektThumbnail({
  collection,
  className = "w-7.5",
}: {
  collection: Objekt.Collection | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return collection === null || failed ? (
    <span
      className={cn(
        "aspect-photocard shrink-0 rounded-[3px] bg-muted",
        className,
      )}
    />
  ) : (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt=""
      decoding="async"
      // an image that failed before hydration never fires onError
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
      className={cn(
        "aspect-photocard shrink-0 rounded-[3px] object-cover",
        className,
      )}
    />
  );
}
