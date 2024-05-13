"use client";

import { ValidObjekt } from "@/lib/universal/objekts";
import Image from "next/image";
import { CSSProperties, PropsWithChildren, memo, useState } from "react";
import MetadataDialog, { fetchObjektQuery } from "./metadata-dialog";
import { getObjektImageUrls, getObjektSlug } from "./objekt-util";
import { useQueryClient } from "@tanstack/react-query";

export type BaseObjektProps<TObjektType extends ValidObjekt> =
  PropsWithChildren<{
    id: string;
    objekt: TObjektType;
  }>;

const MemoizedImage = memo(Image);

interface FlippableObjektProps<TObjektType extends ValidObjekt>
  extends BaseObjektProps<TObjektType> {}

export const FlippableObjekt = memo(function FlippableObjekt<
  TObjektType extends ValidObjekt
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
      className="relative w-full aspect-photocard cursor-pointer object-contain touch-manipulation transition-transform preserve-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180"
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

interface ExpandableObjektProps<TObjektType extends ValidObjekt>
  extends BaseObjektProps<TObjektType> {
  setActive?: (slug: string | null) => void;
  priority: boolean;
}

export const ExpandableObjekt = memo(function ExpandableObjekt<
  TObjektType extends ValidObjekt
>({
  children,
  objekt,
  setActive,
  priority,
}: ExpandableObjektProps<TObjektType>) {
  const queryClient = useQueryClient();

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const slug = getObjektSlug(objekt);
  const { front } = getObjektImageUrls(objekt);

  return (
    <MetadataDialog
      slug={slug}
      isActive={false}
      onClose={() => setActive?.(null)}
    >
      {(openDialog) => (
        <div
          className="isolate relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent"
          style={css}
        >
          <MemoizedImage
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(fetchObjektQuery(slug).queryKey, objekt);
              // update the url
              setActive?.(slug);
              // open the dialog
              openDialog();
            }}
            className="cursor-pointer"
            src={front.display}
            width={291}
            height={450}
            alt={objekt.collectionId}
            quality={100}
            priority={priority}
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
