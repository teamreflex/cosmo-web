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

export type ObjektProps<TObjektType extends ValidObjekt> = PropsWithChildren<{
  id: string;
  objekt: TObjektType;
}>;

const MemoizedImage = memo(Image);
const MemoizedCardFlip = memo(ReactCardFlip);

export default memo(function Objekt<TObjektType extends ValidObjekt>({
  children,
  objekt,
}: ObjektProps<TObjektType>) {
  const [flipped, setFlipped] = useState(false);
  const flip = useCallback(() => setFlipped((prev) => !prev), []);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <MemoizedCardFlip isFlipped={flipped} flipDirection="horizontal">
      <div
        className="isolate relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent"
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
