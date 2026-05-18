import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { m } from "@/i18n/messages";
import { getObjektImageUrls } from "@/lib/client/objekt-util";
import { objektQuery } from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { useShallow } from "zustand/react/shallow";

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
  tokenId?: number | string;
  setActive?: (slug: string | undefined) => void;
  priority?: boolean;
  className?: string;
}>;

/**
 * Displays the front of an objekt and opens the shared MetadataDialog on click.
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
    <div className="@container">
      <div
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "group/objekt relative aspect-photocard touch-manipulation overflow-hidden rounded-photocard bg-secondary outline outline-transparent transition-[transform,box-shadow,outline-color] duration-200 ease-out hover:-translate-y-0.5 hover:outline-cosmo hover:shadow-lg",
          isSelected && "outline-2 outline-foreground hover:outline-foreground",
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
    </div>
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

  function handleClick() {
    // populate the query cache so the dialog skips its initial fetch
    queryClient.setQueryData(
      objektQuery(props.collection.slug).queryKey,
      props.collection,
    );

    if (props.setActive) {
      // URL routing mode: update URL, let RoutedExpandableObjekt sync the dialog
      props.setActive(props.collection.slug);
    } else {
      open(props.collection.slug);
    }
  }

  return (
    <img
      role="button"
      aria-label={m.aria_view_objekt()}
      onMouseOver={prefetch}
      onLoad={() => setIsLoaded(true)}
      onClick={handleClick}
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
