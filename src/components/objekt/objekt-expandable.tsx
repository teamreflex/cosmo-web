import { useShallow } from "zustand/react/shallow";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getObjektImageUrls } from "./common";
import { fetchObjektQuery } from "./metadata/common";
import MetadataDialog from "./metadata-dialog";
import type { PropsWithChildren } from "react";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { cn } from "@/lib/utils";

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
  tokenId?: number | string;
  setActive?: (slug: string | undefined) => void;
  priority?: boolean;
  className?: string;
}>;

/**
 * Displays the front of an objekt and opens a MetadataDialog on click.
 */
export default function ExpandableObjekt({
  children,
  tokenId = 0,
  collection,
  setActive,
  priority = false,
  className,
}: Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const isSelected = useObjektTransfer(
    useShallow((state) => state.isSelected(Number(tokenId))),
  );

  const { front } = getObjektImageUrls(collection);

  function prefetch() {
    const img = new Image();
    img.src = front.download;
  }

  return (
    <MetadataDialog
      slug={collection.slug}
      isActive={false}
      onClose={() => setActive?.(undefined)}
    >
      {({ open }) => (
        <div
          style={{
            "--objekt-background-color": collection.backgroundColor,
            "--objekt-text-color": collection.textColor,
          }}
          className={cn(
            "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-secondary transition-colors ring-2 ring-transparent aspect-photocard drop-shadow-sm",
            isSelected && "ring-foreground",
            className,
          )}
        >
          <img
            role="button"
            onMouseOver={prefetch}
            onLoad={() => setIsLoaded(true)}
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(
                fetchObjektQuery(collection.slug).queryKey,
                collection,
              );
              // update the url
              setActive?.(collection.slug);
              // open the dialog
              open();
            }}
            className={cn(
              "transition-opacity w-full",
              isLoaded === false && "opacity-0",
            )}
            src={front.display}
            width={291}
            height={450}
            alt={collection.collectionId}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />

          {children}
        </div>
      )}
    </MetadataDialog>
  );
}
