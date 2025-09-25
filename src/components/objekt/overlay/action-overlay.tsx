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
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import AddToList from "@/components/lists/add-to-list";
import useOverlayHover from "@/hooks/use-overlay-hover";
import PinObjekt from "@/components/objekt/overlay/pin-button";
import { useObjektOverlay } from "@/store";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  authenticated: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
};

export default function ActionOverlay({
  collection,
  token,
  authenticated,
  isLocked,
  isPinned,
  isPin,
}: Props) {
  const objektLists = useProfileContext((ctx) => ctx.objektLists);
  const [hoverState, createHoverProps] = useOverlayHover();
  const isHidden = useObjektOverlay((state) => state.isHidden);

  // grouping uses nonTransferableReason = "challenge-reward" for gridded objekts
  const usedForGrid =
    token.usedForGrid || token.nonTransferableReason === "used-for-grid";

  // some welcome objekts are sendable
  const isSendableWelcome =
    token.transferable && token.nonTransferableReason === "welcome-objekt";

  // all other objekts, check if they are sendable
  const isSendable =
    isSendableWelcome ||
    (token.transferable && token.nonTransferableReason === undefined);

  const showActions =
    !token.transferable ||
    usedForGrid ||
    isLocked ||
    (isPinned && isPin) ||
    authenticated;

  return (
    <div
      data-hovering={hoverState !== undefined}
      className={cn(
        "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl items-center group h-5 sm:h-9 transition-all overflow-hidden",
        "text-(--objekt-text-color) bg-(--objekt-background-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        (showActions === false || isHidden) && "hidden"
      )}
    >
      <div className="flex items-center gap-2">
        {/* buttons */}

        {/* pinned (viewing other user) */}
        {isPin && isPinned && !authenticated && (
          <Pin className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {/* locked (viewing other user) */}
        {!usedForGrid && !isPin && isLocked && !authenticated && (
          <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
        )}

        {authenticated && (
          <div {...createHoverProps("pin")}>
            <PinObjekt
              collectionId={collection.collectionId}
              tokenId={token.tokenId}
              isPinned={isPinned}
            />
          </div>
        )}

        {/* add to list (authenticated) */}
        {authenticated && !isPin && (
          <div {...createHoverProps("list")}>
            <AddToList
              collectionId={collection.collectionId}
              collectionSlug={collection.slug}
              lists={objektLists}
            />
          </div>
        )}

        {/* lock/unlock (authenticated) */}
        {isSendable && authenticated && !isPin && (
          <div {...createHoverProps("lock")}>
            <LockObjekt tokenId={token.tokenId} isLocked={isLocked} />
          </div>
        )}

        {/* send (authenticated) */}
        {/* {isSendable && authenticated && !isPin && !isLocked && (
          <div {...createHoverProps("send")}>
            <SendObjekt collection={collection} token={token} />
          </div>
        )} */}

        {/* statuses */}

        {!isPin && (
          <div className="contents">
            {/* generic non-transferable */}
            {token.nonTransferableReason === "not-transferable" && (
              <MailX
                {...createHoverProps("not-transferable")}
                className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
              />
            )}

            {/* mint pending */}
            {token.nonTransferableReason === "mint-pending" && (
              <DownloadCloud
                {...createHoverProps("mint-pending")}
                className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
              />
            )}

            {/* event reward */}
            {!usedForGrid &&
              token.nonTransferableReason === "challenge-reward" && (
                <PartyPopper
                  {...createHoverProps("challenge-reward")}
                  className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
                />
              )}

            {/* welcome reward */}
            {!isSendable &&
              token.nonTransferableReason === "welcome-objekt" && (
                <MailX
                  {...createHoverProps("welcome-objekt")}
                  className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
                />
              )}

            {/* used for grid */}
            {usedForGrid && (
              <Grid2X2
                {...createHoverProps("used-for-grid")}
                className="h-3 w-3 sm:h-5 sm:w-5 shrink-0"
              />
            )}

            {/* used in lenticular, for some reason the nonTransferableReason isn't used here */}
            {token.lenticularPairTokenId !== 0 && (
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
            {token.nonTransferableReason === "not-transferable" && (
              <OverlayStatus>Not transferable</OverlayStatus>
            )}
            {token.nonTransferableReason === "mint-pending" && (
              <OverlayStatus>Mint pending</OverlayStatus>
            )}
            {!usedForGrid &&
              token.nonTransferableReason === "challenge-reward" && (
                <OverlayStatus>Event reward</OverlayStatus>
              )}
            {!isSendable &&
              token.nonTransferableReason === "welcome-objekt" && (
                <OverlayStatus>Welcome reward</OverlayStatus>
              )}
            {usedForGrid && <OverlayStatus>Used for grid</OverlayStatus>}
            {token.lenticularPairTokenId !== 0 && (
              <OverlayStatus>Lenticular pair</OverlayStatus>
            )}
            {hoverState === undefined && !token.nonTransferableReason && (
              <OverlayStatus>{isLocked ? "Locked" : "Unlocked"}</OverlayStatus>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
