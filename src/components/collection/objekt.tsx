"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import LockObjekt from "./lock-button";
import SendObjekt from "./send-button";
import { CSSProperties, useState } from "react";
import ReactCardFlip from "react-card-flip";
import { ExternalLink, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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
          <>
            <ObjektInformationToggle objekt={objekt} />
            <ObjektStatusButtons
              objekt={objekt}
              locked={locked}
              setLocked={setLocked}
            />
          </>
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

function ObjektStatusButtons({
  objekt,
  locked,
  setLocked,
}: {
  objekt: OwnedObjekt;
  locked: boolean;
  setLocked: (locked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl flex gap-2 items-center group h-5 sm:h-9 transition-all overflow-hidden",
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
        <LockObjekt objekt={objekt} locked={locked} onLockChange={setLocked} />
      )}
      <ObjektStatusText show={locked} text="Locked" />
      <ObjektStatusText
        show={!objekt.transferable && !objekt.usedForGrid}
        text="Not transferable"
      />
      <ObjektStatusText show={objekt.usedForGrid} text="Used for grid" />
    </div>
  );
}

function ObjektInformationToggle({ objekt }: { objekt: OwnedObjekt }) {
  const [open, setOpen] = useState(false);

  const formatted = format(Date.parse(objekt.receivedAt), "dd/MM/yy h:mmb");
  const opensea = `https://opensea.io/assets/matic/${objekt.tokenAddress}/${objekt.tokenId}`;

  return (
    <div
      data-open={open}
      className={cn(
        "absolute bottom-0 left-0 p-1 sm:p-2 rounded-tr-lg sm:rounded-tr-xl flex gap-2 group h-5 sm:h-9 w-5 sm:w-9 transition-all overflow-hidden",
        "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
        "data-[open=true]:w-20 data-[open=true]:sm:w-32 data-[open=true]:h-32 data-[open=true]:sm:h-32"
      )}
    >
      <button
        className="z-50 hover:cursor-pointer hover:scale-110 transition-all flex items-center place-self-end"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Maximize2 className="h-3 w-3 sm:h-5 sm:w-5" />
      </button>

      <div className="z-40 absolute flex flex-col gap-1 group-data-[open=false]:opacity-0 group-data-[open=true]:opacity-100 transition-all">
        <div className="flex flex-col text-xs">
          <Link
            className="font-semibold flex gap-1 items-center underline"
            target="_blank"
            href={opensea}
          >
            <span>OpenSea</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Token ID</span>
          <span>{objekt.tokenId}</span>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Received</span>
          <span>{formatted}</span>
        </div>
      </div>
    </div>
  );
}
