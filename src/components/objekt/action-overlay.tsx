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
import LockObjekt from "./lock-button";
import OverlayStatus from "./overlay-status";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { useProfile } from "@/hooks/use-profile";
import AddToList from "../lists/add-to-list";
import { getObjektSlug } from "./objekt-util";
import useOverlayHover from "@/hooks/use-overlay-hover";

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
  const [hoverState, createHoverProps] = useOverlayHover();
  const { objektLists } = useProfile();

  const slug = getObjektSlug(objekt);

  const showActions =
    !objekt.transferable ||
    objekt.usedForGrid ||
    isLocked ||
    (objekt.transferable && authenticated);

  return (
    <div
      data-hovering={hoverState !== undefined}
      className={cn(
        "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl items-center group h-5 sm:h-9 transition-all overflow-hidden",
        "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        showActions === false && "hidden"
      )}
    >
      <div className="flex items-center gap-2">
        {/* buttons */}

        {/* locked (viewing other user) */}
        {!objekt.usedForGrid && isLocked && !authenticated && (
          <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* add to list (authenticated) */}
        {authenticated && (
          <div {...createHoverProps("list")}>
            <AddToList
              collectionId={objekt.collectionId}
              collectionSlug={slug}
              lists={objektLists}
            />
          </div>
        )}

        {/* lock/unlock (authenticated) */}
        {objekt.transferable && authenticated && (
          <div {...createHoverProps("lock")}>
            <LockObjekt
              objekt={objekt}
              isLocked={isLocked}
              onLockChange={toggleLock}
            />
          </div>
        )}

        {/* statsuses */}

        {/* generic non-transferable */}
        {objekt.nonTransferableReason === "not-transferable" && (
          <MailX
            {...createHoverProps("not-transferable")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}

        {/* mint pending */}
        {objekt.nonTransferableReason === "mint-pending" && (
          <DownloadCloud
            {...createHoverProps("mint-pending")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}

        {/* event reward */}
        {objekt.nonTransferableReason === "challenge-reward" && (
          <PartyPopper
            {...createHoverProps("challenge-reward")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}

        {/* welcome reward */}
        {objekt.nonTransferableReason === "welcome-objekt" && (
          <MailX
            {...createHoverProps("welcome-objekt")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}

        {/* used for grid */}
        {objekt.nonTransferableReason === "used-for-grid" && (
          <Grid2X2
            {...createHoverProps("used-for-grid")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}

        {/* used in lenticular, for some reason the nonTransferableReason isn't used here */}
        {objekt.lenticularPairTokenId !== null && (
          <Smartphone
            {...createHoverProps("lenticular-objekt")}
            className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
          />
        )}
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-48 overflow-hidden transition-all">
        {hoverState === "list" && authenticated && (
          <OverlayStatus>Add to List</OverlayStatus>
        )}
        {hoverState === "lock" && (
          <OverlayStatus>{isLocked ? "Unlock" : "Lock"}</OverlayStatus>
        )}
        {objekt.nonTransferableReason === "not-transferable" && (
          <OverlayStatus>Not transferable</OverlayStatus>
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
        {hoverState === undefined && !objekt.nonTransferableReason && (
          <OverlayStatus>{isLocked ? "Locked" : "Unlocked"}</OverlayStatus>
        )}
      </div>
    </div>
  );
});
