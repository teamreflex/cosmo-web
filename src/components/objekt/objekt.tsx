"use client";

import Image from "next/image";
import { CSSProperties, PropsWithChildren, memo, useState } from "react";
import ReactCardFlip from "react-card-flip";
import { ObjektContext, ObjektProvider, ValidObjekt } from "./context";

type ObjektProps<TObjektType extends ValidObjekt> = PropsWithChildren<{
  objekt: TObjektType;
  authenticated: boolean;
}>;

export default memo(function Objekt<TObjektType extends ValidObjekt>({
  children,
  objekt,
  authenticated,
}: ObjektProps<TObjektType>) {
  const [flipped, setFlipped] = useState(false);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <ObjektProvider objekt={objekt} authenticated={authenticated}>
      <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">
        <div
          className="isolate relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent"
          style={css}
        >
          <Image
            onClick={() => setFlipped((prev) => !prev)}
            className="cursor-pointer"
            src={objekt.frontImage}
            width={291}
            height={450}
            alt={objekt.collectionId}
            quality={100}
          />

          {children}
        </div>

        <Image
          onClick={() => setFlipped((prev) => !prev)}
          className="cursor-pointer"
          src={objekt.backImage}
          width={291}
          height={450}
          alt={objekt.collectionId}
          quality={100}
        />
      </ReactCardFlip>
    </ObjektProvider>
  );
});
