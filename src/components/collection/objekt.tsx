"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import LockObjekt from "./lock-button";
import SendObjekt from "./send-button";
import { useState } from "react";

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
  const [locked, setLocked] = useState(
    lockedObjekts.includes(parseInt(objekt.tokenId))
  );

  return (
    <div className="relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation">
      <Image
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
            objekt.transferable && "w-10 sm:w-16",
            !objekt.transferable &&
              !objekt.usedForGrid &&
              "w-5 sm:w-9 sm:hover:w-[8.8rem]",
            objekt.usedForGrid && "w-5 sm:w-9 sm:hover:w-[7.7rem]",
            locked && "w-5 sm:w-9 sm:hover:w-[5.5rem]"
          )}
          style={{
            backgroundColor: objekt.backgroundColor,
            color: objekt.textColor,
          }}
        >
          {!locked && <SendObjekt objekt={objekt} />}
          {objekt.transferable && (
            <LockObjekt
              objekt={objekt}
              locked={locked}
              onLockChange={setLocked}
            />
          )}
          {locked && (
            <p className="text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all">
              Locked
            </p>
          )}
          {!objekt.transferable && !objekt.usedForGrid && (
            <p className="text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all">
              Not transferable
            </p>
          )}
          {objekt.usedForGrid && (
            <p className="text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all">
              Used for grid
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ObjektNumber({ objekt }: { objekt: OwnedObjekt }) {
  return (
    <div
      className={cn(
        "absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[6px] sm:text-xs md:text-sm lg:text-base"
      )}
      style={{ color: objekt.textColor }}
    >
      <span>{objekt.collectionNo}</span>
      <span>#{pad(objekt.objektNo.toString())}</span>
    </div>
  );
}
