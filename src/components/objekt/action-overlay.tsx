"use client";

import { cn } from "@/lib/utils";
import {
  DownloadCloud,
  Grid2X2,
  Lock,
  MailX,
  PartyPopper,
  Smartphone,
} from "lucide-react";
import { memo } from "react";
import SendObjekt from "./send-button";
import LockObjekt from "./lock-button";
import OverlayStatus from "./overlay-status";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";

type Props = {
  objekt: OwnedObjekt;
  authenticated: boolean;
  isLocked: boolean;
  toggleLock: (tokenId: number) => void;
};

export default function ActionOverlay({
  objekt,
  authenticated,
  isLocked,
  toggleLock,
}: Props) {
  return (
    <Overlay
      objekt={objekt}
      isLocked={isLocked}
      toggleLock={toggleLock}
      authenticated={authenticated}
    />
  );
}

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  isLocked,
  toggleLock,
}: {
  objekt: OwnedObjekt;
  authenticated: boolean;
  isLocked: boolean;
  toggleLock: (tokenId: number) => void;
}) {
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

        {/* used in lenticular, for some reason the nonTransferableReason isn't used here */}
        {objekt.lenticularPairTokenId !== null && (
          <Smartphone className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* send objekt */}
        {/* {!isLocked && objekt.transferable && authenticated && (
          <SendObjekt objekt={objekt} />
        )} */}

        {/* locked (viewing other user) */}
        {!objekt.usedForGrid && isLocked && !authenticated && (
          <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* lock/unlock (authenticated) */}
        {objekt.transferable && authenticated && (
          <LockObjekt
            objekt={objekt}
            isLocked={isLocked}
            onLockChange={toggleLock}
          />
        )}
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        {!objekt.nonTransferableReason && isLocked && (
          <OverlayStatus>Locked</OverlayStatus>
        )}
        {objekt.nonTransferableReason === "mint-pending" && (
          <OverlayStatus>Mint pending</OverlayStatus>
        )}
        {objekt.nonTransferableReason === "challenge-reward" && (
          <OverlayStatus>Event reward</OverlayStatus>
        )}
        {objekt.nonTransferableReason === "welcome-objekt" && (
          <OverlayStatus>Welcome reward</OverlayStatus>
        )}
        {objekt.nonTransferableReason === "used-for-grid" && (
          <OverlayStatus>Used for grid</OverlayStatus>
        )}
        {objekt.lenticularPairTokenId !== null && (
          <OverlayStatus>Lenticular pair</OverlayStatus>
        )}
      </div>
    </div>
  );
});
