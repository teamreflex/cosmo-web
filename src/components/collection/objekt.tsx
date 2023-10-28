"use client";

import { OwnedObjekt } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import LockObjekt from "./lock-button";
import SendObjekt from "./send-button";
import { CSSProperties, PropsWithChildren, useContext, useState } from "react";
import ReactCardFlip from "react-card-flip";
import { ExternalLink, Grid2X2, Lock, MailX, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useElementSize } from "usehooks-ts";
import { LockedObjektContext } from "@/context/objekt";

type ObjektProps = {
  objekt: OwnedObjekt;
  showButtons: boolean;
  authenticated: boolean;
};

export default function Objekt({
  objekt,
  showButtons,
  authenticated,
}: ObjektProps) {
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const css = {
    "--objekt-background-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">
      <div
        className={cn(
          "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent",
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
        {loaded && <ObjektNumber objekt={objekt} />}
        {loaded && showButtons && (
          <>
            <InformationOverlay objekt={objekt} />
            <ActionOverlay objekt={objekt} authenticated={authenticated} />
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
        quality={100}
      />
    </ReactCardFlip>
  );
}

function ObjektNumber({ objekt }: { objekt: OwnedObjekt }) {
  const [ref, { width }] = useElementSize();

  // sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number
  // using line-height works around it, as the background container is transparent so there's no resulting overflow
  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[var(--objekt-text-color)] select-none"
      style={{ lineHeight: `${width}px`, fontSize: `${width * 0.55}px` }}
    >
      <span>{objekt.collectionNo}</span>
      <span>#{objekt.objektNo.toString().padStart(5, "0")}</span>
    </div>
  );
}

function ActionOverlay({
  objekt,
  authenticated,
}: {
  objekt: OwnedObjekt;
  authenticated: boolean;
}) {
  const { lockedObjekts, lockObjekt } = useContext(
    LockedObjektContext
  ) as LockedObjektContext;

  const isLocked = lockedObjekts.includes(parseInt(objekt.tokenId));
  const showActions =
    !objekt.transferable ||
    objekt.usedForGrid ||
    isLocked ||
    (objekt.transferable && authenticated);

  return (
    <div
      className={cn(
        "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl items-center group h-5 sm:h-9 transition-all overflow-hidden",
        "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        showActions === false && "hidden"
      )}
    >
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* used in grid */}
        {objekt.usedForGrid && (
          <Grid2X2 className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* not transferable */}
        {!objekt.usedForGrid && !objekt.transferable && (
          <MailX className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* send objekt */}
        {!isLocked && objekt.transferable && authenticated && (
          <SendObjekt objekt={objekt} />
        )}

        {/* locked (viewing other user) */}
        {isLocked && !authenticated && (
          <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* lock/unlock (authenticated) */}
        {objekt.transferable && authenticated && (
          <LockObjekt
            objekt={objekt}
            isLocked={isLocked}
            onLockChange={lockObjekt}
          />
        )}
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        {isLocked && <StatusText>Locked</StatusText>}
        {!objekt.transferable && objekt.status === "pending" && (
          <StatusText>Mint pending</StatusText>
        )}
        {!objekt.transferable &&
          !objekt.usedForGrid &&
          objekt.status === "minted" && (
            <StatusText>Not transferable</StatusText>
          )}
        {objekt.usedForGrid && <StatusText>Used for grid</StatusText>}
      </div>
    </div>
  );
}

function StatusText({ children }: PropsWithChildren) {
  return <p className="pl-2">{children}</p>;
}

function InformationOverlay({ objekt }: { objekt: OwnedObjekt }) {
  const [open, setOpen] = useState(false);

  const formatted = format(Date.parse(objekt.receivedAt), "dd/MM/yy h:mmaa");
  const opensea = new URL(
    `https://opensea.io/assets/matic/${objekt.tokenAddress}/${objekt.tokenId}`
  );

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
            className={cn(
              "font-semibold flex gap-1 items-center underline",
              !open && "pointer-events-none"
            )}
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
