"use client";

import { OwnedObjekt } from "@/lib/universal/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { CSSProperties, PropsWithChildren, memo, useState } from "react";
import ReactCardFlip from "react-card-flip";
import { IndexedObjekt } from "@/lib/universal/objekt-index";
import { ObjektContext } from "./util";

type ObjektProps = PropsWithChildren<{
  objekt: OwnedObjekt | IndexedObjekt;
  authenticated: boolean;
}>;

export default memo(function Objekt({
  children,
  objekt,
  authenticated,
}: ObjektProps) {
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <ObjektContext.Provider value={{ objekt, authenticated }}>
      <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">
        <div
          className={cn(
            "isolate relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent",
            !loaded && "animate-pulse"
          )}
          style={css}
        >
          <Image
            onClick={() => setFlipped((prev) => !prev)}
            onLoad={() => setLoaded(true)}
            className="cursor-pointer"
            src={objekt.frontImage}
            width={291}
            height={450}
            alt={objekt.collectionId}
            quality={100}
          />

          {loaded && children}
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
    </ObjektContext.Provider>
  );
});
