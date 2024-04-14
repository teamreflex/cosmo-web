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
import MetadataDialog from "./metadata-dialog";

export type ObjektProps<TObjektType extends ValidObjekt> = PropsWithChildren<{
  id: string;
  objekt: TObjektType;
}>;

const MemoizedImage = memo(Image);
const MemoizedCardFlip = memo(ReactCardFlip);

export const FlippableObjekt = memo(function FlippableObjekt<
  TObjektType extends ValidObjekt
>({ children, objekt }: ObjektProps<TObjektType>) {
  const [flipped, setFlipped] = useState(false);
  const flip = useCallback(() => setFlipped((prev) => !prev), []);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <MemoizedCardFlip isFlipped={flipped} flipDirection="horizontal">
      <div
        className="isolate relative overflow-hidden rounded-xl lg:rounded-2xl touch-manipulation bg-accent"
        style={css}
      >
        <MemoizedImage
          onClick={flip}
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

      <MemoizedImage
        onClick={flip}
        className="cursor-pointer"
        src={objekt.backImage}
        width={291}
        height={450}
        alt={objekt.collectionId}
        quality={100}
        priority={false}
        loading="lazy"
        unoptimized
      />
    </MemoizedCardFlip>
  );
});

interface ExpandableObjektProps<TObjektType extends ValidObjekt>
  extends ObjektProps<TObjektType> {
  isActive?: boolean;
  setActive?: (slug: string | null) => void;
}

export const ExpandableObjekt = memo(function ExpandableObjekt<
  TObjektType extends ValidObjekt
>({
  children,
  objekt,
  isActive = false,
  setActive,
}: ExpandableObjektProps<TObjektType>) {
  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const slug =
    `${objekt.season}-${objekt.member}-${objekt.collectionNo}`.toLowerCase();

  return (
    <MetadataDialog
      objekt={objekt}
      isActive={isActive}
      // onClose={() => setActive?.(null)}
    >
      {(openDialog) => (
        <div
          className="isolate relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent"
          style={css}
        >
          <MemoizedImage
            onClick={() => {
              // setActive?.(slug);
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
