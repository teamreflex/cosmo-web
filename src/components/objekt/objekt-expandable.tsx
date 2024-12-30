import { useShallow } from "zustand/react/shallow";
import { PropsWithChildren, useState } from "react";
import { getObjektImageUrls } from "./common";
import { useQueryClient } from "@tanstack/react-query";
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { fetchObjektQuery } from "./metadata-dialog";
import MetadataDialog from "./metadata-dialog";
import { cn } from "@/lib/utils";
import { default as NextImage } from "next/image";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
  tokenId?: number | string;
  setActive?: (slug: string | null) => void;
}>;

/**
 * Displays the front of an objekt and opens a MetadataDialog on click.
 */
export default function ExpandableObjekt({
  children,
  tokenId = 0,
  collection,
  setActive,
}: Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(Number(tokenId)))
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
      onClose={() => setActive?.(null)}
    >
      {({ open }) => (
        <div
          style={{
            "--objekt-background-color": collection.backgroundColor,
            "--objekt-text-color": collection.textColor,
          }}
          className={cn(
            "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent transition-colors ring-2 ring-transparent aspect-photocard",
            isSelected && "ring-foreground"
          )}
        >
          <NextImage
            role="button"
            onMouseOver={prefetch}
            onLoad={() => setIsLoaded(true)}
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(
                fetchObjektQuery(collection.slug).queryKey,
                collection
              );
              // update the url
              setActive?.(collection.slug);
              // open the dialog
              open();
            }}
            className={cn(
              "cursor-pointer transition-opacity w-full",
              isLoaded === false && "opacity-0"
            )}
            src={front.display}
            width={291}
            height={450}
            alt={collection.collectionId}
            quality={100}
            unoptimized
          />

          {children}
        </div>
      )}
    </MetadataDialog>
  );
}
