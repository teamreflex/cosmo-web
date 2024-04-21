"use client";

import { ValidObjekt } from "@/lib/universal/objekts";
import Image from "next/image";
import {
  CSSProperties,
  PropsWithChildren,
  memo,
  useCallback,
  useState,
} from "react";
import ReactCardFlip from "react-card-flip";
import MetadataDialog, { fetchObjektQuery } from "./metadata-dialog";
import { getObjektSlug } from "./objekt-util";
import { useQueryClient } from "@tanstack/react-query";

export type BaseObjektProps<TObjektType extends ValidObjekt> =
  PropsWithChildren<{
    id: string;
    objekt: TObjektType;
  }>;

const MemoizedImage = memo(Image);
const MemoizedCardFlip = memo(ReactCardFlip);

interface FlippableObjektProps<TObjektType extends ValidObjekt>
  extends BaseObjektProps<TObjektType> {}

export const FlippableObjekt = memo(function FlippableObjekt<
  TObjektType extends ValidObjekt
>({ children, objekt }: FlippableObjektProps<TObjektType>) {
  const [flipped, setFlipped] = useState(false);
  const flip = useCallback(() => setFlipped((prev) => !prev), []);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <MemoizedCardFlip
      isFlipped={flipped}
      flipDirection="horizontal"
      containerClassName="isolate relative h-full w-full aspect-photocard object-contain overflow-hidden rounded-xl lg:rounded-2xl touch-manipulation"
      containerStyle={css}
    >
      <div>
        <MemoizedImage
          onClick={flip}
          className="cursor-pointer"
          src={objekt.frontImage}
          fill={true}
          alt={objekt.collectionId}
          quality={100}
          priority={false}
          loading="lazy"
          unoptimized
        />

        {children}
      </div>

      <div>
        <MemoizedImage
          onClick={flip}
          className="cursor-pointer"
          src={objekt.backImage}
          fill={true}
          alt={objekt.collectionId}
          quality={100}
          priority={false}
          loading="lazy"
          unoptimized
        />
      </div>
    </MemoizedCardFlip>
  );
});

interface ExpandableObjektProps<TObjektType extends ValidObjekt>
  extends BaseObjektProps<TObjektType> {
  setActive?: (slug: string | null) => void;
}

export const ExpandableObjekt = memo(function ExpandableObjekt<
  TObjektType extends ValidObjekt
>({ children, objekt, setActive }: ExpandableObjektProps<TObjektType>) {
  const queryClient = useQueryClient();

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const slug = getObjektSlug(objekt);

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
            src={objekt.frontImage}
            width={291}
            height={450}
            alt={objekt.collectionId}
            quality={100}
            priority={false}
            loading="lazy"
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
