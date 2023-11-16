"use client";

import { LockedObjektContext } from "@/context/objekt";
import { OwnedObjekt } from "@/lib/universal/cosmo";
import { cn } from "@/lib/utils";
import { DownloadCloud, Grid2X2, Lock, MailX, PartyPopper } from "lucide-react";
import { PropsWithChildren, useContext } from "react";
import SendObjekt from "./send-button";
import LockObjekt from "./lock-button";
import { ObjektContext } from "./util";

export default function ActionOverlay() {
  const { objekt, authenticated } = useContext(
    ObjektContext
  ) as ObjektContext<OwnedObjekt>;
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
        {/* mint pending */}
        {objekt.nonTransferableReason === "mint-pending" && (
          <DownloadCloud className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* event reward */}
        {objekt.nonTransferableReason === "challenge-reward" && (
          <PartyPopper className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* welcome reward */}
        {objekt.nonTransferableReason === "welcome-objekt" && (
          <MailX className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* used in grid */}
        {objekt.nonTransferableReason === "used-for-grid" && (
          <Grid2X2 className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* send objekt */}
        {!isLocked && objekt.transferable && authenticated && (
          <SendObjekt objekt={objekt} />
        )}

        {/* locked (viewing other user) */}
        {!objekt.usedForGrid && isLocked && !authenticated && (
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
        {!objekt.nonTransferableReason && isLocked && (
          <StatusText>Locked</StatusText>
        )}
        {objekt.nonTransferableReason === "mint-pending" && (
          <StatusText>Mint pending</StatusText>
        )}
        {objekt.nonTransferableReason === "challenge-reward" && (
          <StatusText>Event reward</StatusText>
        )}
        {objekt.nonTransferableReason === "welcome-objekt" && (
          <StatusText>Welcome reward</StatusText>
        )}
        {objekt.nonTransferableReason === "used-for-grid" && (
          <StatusText>Used for grid</StatusText>
        )}
      </div>
    </div>
  );
}

function StatusText({ children }: PropsWithChildren) {
  return <p className="pl-2">{children}</p>;
}
