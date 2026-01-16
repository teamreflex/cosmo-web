import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { useShallow } from "zustand/react/shallow";
import { getObjektImageUrls } from "./common";
import MetadataDialog, { useMetadataDialog } from "./metadata-dialog";
import { fetchObjektQuery } from "./metadata/common";

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
  const isSelected = useObjektTransfer(
    useShallow((state) => state.isSelected(Number(tokenId))),
  );

  return (
    <MetadataDialog
      slug={collection.slug}
      defaultOpen={false}
      onClose={() => setActive?.(undefined)}
    >
      <div
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "relative aspect-photocard touch-manipulation overflow-hidden rounded-lg bg-secondary ring-2 ring-transparent drop-shadow-sm transition-colors md:rounded-xl lg:rounded-2xl",
          isSelected && "ring-foreground",
          className,
        )}
      >
        <FrontImage
          collection={collection}
          setActive={setActive}
          priority={priority}
        />

        {children}
      </div>
    </MetadataDialog>
  );
}

type FrontImageProps = {
  collection: Objekt.Collection;
  setActive?: (slug: string | undefined) => void;
  priority?: boolean;
};

function FrontImage(props: FrontImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();

  const { front } = getObjektImageUrls(props.collection);

  function prefetch() {
    const img = new Image();
    img.src = front.download;
  }

  return (
    <img
      role="button"
      onMouseOver={prefetch}
      onLoad={() => setIsLoaded(true)}
      onClick={() => {
        // populate the query cache so it doesn't re-fetch
        queryClient.setQueryData(
          fetchObjektQuery(props.collection.slug).queryKey,
          props.collection,
        );

        if (props.setActive) {
          // URL routing mode: update URL, let RoutedExpandableObjekt handle dialog
          props.setActive(props.collection.slug);
        } else {
          // Local dialog mode: directly open dialog
          open();
        }
      }}
      className={cn(
        "w-full transition-opacity",
        isLoaded === false && "opacity-0",
      )}
      src={front.display}
      width={291}
      height={450}
      alt={props.collection.collectionId}
      decoding="async"
      fetchPriority={props.priority ? "high" : "auto"}
    />
  );
}
