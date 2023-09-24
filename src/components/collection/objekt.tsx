"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import LockObjekt from "./lock-button";
import SendObjekt from "./send-button";
import { CSSProperties, useState } from "react";
import ReactCardFlip from "react-card-flip";

type ObjektProps = {
  objekt: OwnedObjekt;
  showButtons: boolean;
  lockedObjekts: number[];
};

function pad(n: string) {
  n = n + "";
  return n.length >= 5 ? n : new Array(5 - n.length + 1).join("0") + n;
}

export default function Objekt({
  objekt,
  showButtons,
  lockedObjekts,
}: ObjektProps) {
  const [flipped, setFlipped] = useState(false);
  const [locked, setLocked] = useState(
    lockedObjekts.includes(parseInt(objekt.tokenId))
  );

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">
      <div
        className="relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation"
        style={css}
      >
        <Image
          onClick={() => setFlipped((prev) => !prev)}
          className="cursor-pointer"
          src={objekt.frontImage}
          width={291}
          height={450}
          alt={objekt.collectionId}
        />
        <ObjektNumber objekt={objekt} />
        {showButtons && (
          <div
            className={cn(
              "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl flex gap-2 items-center shadow-md group h-5 sm:h-9 transition-all overflow-hidden",
              "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
              objekt.transferable && "w-10 sm:w-16",
              !objekt.transferable &&
                !objekt.usedForGrid &&
                "w-5 sm:w-9 sm:hover:w-[8.8rem]",
              objekt.usedForGrid && "w-5 sm:w-9 sm:hover:w-[7.7rem]",
              locked && "w-5 sm:w-9 sm:hover:w-[5.5rem]"
            )}
          >
            {!locked && <SendObjekt objekt={objekt} />}
            {objekt.transferable && (
              <LockObjekt
                objekt={objekt}
                locked={locked}
                onLockChange={setLocked}
              />
            )}
            <ObjektStatusText show={locked} text="Locked" />
            <ObjektStatusText
              show={!objekt.transferable && !objekt.usedForGrid}
              text="Not transferable"
            />
            <ObjektStatusText show={objekt.usedForGrid} text="Used for grid" />
          </div>
        )}
      </div>
      <Image
        onClick={() => setFlipped((prev) => !prev)}
        className="cursor-pointer"
        src={objekt.backImage}
        width={291}
        height={450}
        alt={objekt.collectionId}
      />
    </ReactCardFlip>
  );
}

function ObjektNumber({ objekt }: { objekt: OwnedObjekt }) {
  return (
    <div className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[6px] sm:text-xs md:text-sm lg:text-base text-[var(--objekt-text-color)]">
      <span>{objekt.collectionNo}</span>
      <span>#{pad(objekt.objektNo.toString())}</span>
    </div>
  );
}

function ObjektStatusText({ show, text }: { show: boolean; text: string }) {
  if (show) {
    return (
      <p className="text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all">
        {text}
      </p>
    );
  }
  return null;
}
