"use client";

import { cn } from "@/lib/utils";
import {
  DownloadCloud,
  Grid2X2,
  Lock,
  MailX,
  PartyPopper,
  Pin,
  Smartphone,
} from "lucide-react";
import LockObjekt from "./lock-button";
import OverlayStatus from "./overlay-status";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { useProfileContext } from "@/hooks/use-profile";
import AddToList from "@/components/lists/add-to-list";
import useOverlayHover from "@/hooks/use-overlay-hover";
import PinObjekt from "@/components/objekt/overlay/pin-button";
import SendObjekt from "./send-button";

type Props = {
  objekt: CosmoObjekt;
  slug: string;
  authenticated: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
};

export default function ActionOverlay({
  objekt,
  slug,
  authenticated,
  isLocked,
  isPinned,
  isPin,
}: Props) {
  const objektLists = useProfileContext((ctx) => ctx.objektLists);
  const [hoverState, createHoverProps] = useOverlayHover();

  const showActions =
    !objekt.transferable ||
    objekt.usedForGrid ||
    isLocked ||
    isPinned ||
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

        {/* pinned (viewing other user) */}
        {isPin && isPinned && !authenticated && (
          <Pin className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* locked (viewing other user) */}
        {!objekt.usedForGrid && !isPin && isLocked && !authenticated && (
          <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {authenticated && (
          <div {...createHoverProps("pin")}>
            <PinObjekt objekt={objekt} isPinned={isPinned} />
          </div>
        )}

        {/* add to list (authenticated) */}
        {authenticated && !isPin && (
          <div {...createHoverProps("list")}>
            <AddToList
              collectionId={objekt.collectionId}
              collectionSlug={slug}
              lists={objektLists}
            />
          </div>
        )}

        {/* lock/unlock (authenticated) */}
        {objekt.transferable && authenticated && !isPin && (
          <div {...createHoverProps("lock")}>
            <LockObjekt objekt={objekt} isLocked={isLocked} />
          </div>
        )}

        {/* send (authenticated) */}
        {objekt.transferable && authenticated && !isPin && !isLocked && (
          <div {...createHoverProps("send")}>
            <SendObjekt objekt={objekt} />
          </div>
        )}

        {/* statuses */}

        {!isPin && (
          <div className="contents">
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
        )}
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-48 overflow-hidden transition-all">
        {isPin ? (
          <OverlayStatus>Pinned</OverlayStatus>
        ) : (
          <div className="contents">
            {hoverState === "send" && authenticated && (
              <OverlayStatus>Send</OverlayStatus>
            )}
            {hoverState === "list" && authenticated && (
              <OverlayStatus>Add to List</OverlayStatus>
            )}
            {hoverState === "lock" && (
              <OverlayStatus>{isLocked ? "Unlock" : "Lock"}</OverlayStatus>
            )}
            {hoverState === "pin" && (
              <OverlayStatus>{isPinned ? "Unpin" : "Pin"}</OverlayStatus>
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
        )}
      </div>
    </div>
  );
}
