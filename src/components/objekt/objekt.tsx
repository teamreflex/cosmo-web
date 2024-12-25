"use client";

import { LegacyObjekt } from "@/lib/universal/objekts";
import { default as NextImage } from "next/image";
import { CSSProperties, PropsWithChildren, memo, useState } from "react";
import MetadataDialog, { fetchObjektQuery } from "./metadata-dialog";
import { getObjektImageUrls, getObjektSlug } from "./objekt-util";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { useShallow } from "zustand/react/shallow";

export type BaseObjektProps<TObjektType extends LegacyObjekt> =
  PropsWithChildren<{
    id: string | number;
    objekt: TObjektType;
    serial?: number;
  }>;

const MemoizedImage = memo(NextImage);

interface FlippableObjektProps<TObjektType extends LegacyObjekt>
  extends BaseObjektProps<TObjektType> {}

export const FlippableObjekt = memo(function FlippableObjekt<
  TObjektType extends LegacyObjekt,
>({ children, objekt }: FlippableObjektProps<TObjektType>) {
  const [flipped, setFlipped] = useState(false);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <div
      onClick={() => setFlipped((prev) => !prev)}
      data-flipped={flipped}
      className={cn(
        "relative bg-accent w-full aspect-photocard cursor-pointer object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-2xl"
      )}
      style={css}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        <MemoizedImage
          src={objekt.frontImage}
          fill={true}
          alt={objekt.collectionId}
          unoptimized
        />

        {children}
      </div>

      {/* back */}
      <div className="absolute inset-0 backface-hidden rotate-y-180">
        <MemoizedImage
          src={objekt.backImage}
          fill={true}
          alt={objekt.collectionId}
          unoptimized
        />
      </div>
    </div>
  );
});

interface ExpandableObjektProps<TObjektType extends LegacyObjekt>
  extends BaseObjektProps<TObjektType> {
  setActive?: (slug: string | null) => void;
}

export const ExpandableObjekt = memo(function ExpandableObjekt<
  TObjektType extends LegacyObjekt,
>({ children, id, objekt, setActive }: ExpandableObjektProps<TObjektType>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(Number(id)))
  );

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const slug = getObjektSlug(objekt);
  const { front } = getObjektImageUrls(objekt);

  function prefetch() {
    const img = new Image();
    img.src = front.download;
  }

  return (
    <MetadataDialog
      slug={slug}
      isActive={false}
      onClose={() => setActive?.(null)}
    >
      {(openDialog) => (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent transition-colors ring-2 ring-transparent aspect-photocard",
            isSelected && "ring-foreground"
          )}
          style={css}
        >
          <MemoizedImage
            onMouseOver={prefetch}
            onLoad={() => setIsLoaded(true)}
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(fetchObjektQuery(slug).queryKey, objekt);
              // update the url
              setActive?.(slug);
              // open the dialog
              openDialog();
            }}
            className={cn(
              "cursor-pointer transition-opacity w-full",
              isLoaded === false && "opacity-0"
            )}
            src={front.display}
            width={291}
            height={450}
            alt={objekt.collectionId}
            quality={100}
            unoptimized
          />

          {children}
        </div>
      )}
    </MetadataDialog>
  );
});

type RoutedExpandableObjektProps = {
  slug: string;
  setActive: (slug: string | null) => void;
};

export const RoutedExpandableObjekt = memo(function RoutedExpandableObjekt({
  slug,
  setActive,
}: RoutedExpandableObjektProps) {
  return (
    <MetadataDialog
      slug={slug}
      isActive={true}
      onClose={() => setActive(null)}
    />
  );
});
