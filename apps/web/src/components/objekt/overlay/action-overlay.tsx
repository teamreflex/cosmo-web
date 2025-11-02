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
import { m } from "@/i18n/messages";

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
        "group absolute top-0 left-0 h-5 items-center overflow-hidden rounded-br-lg p-1 transition-all sm:h-9 sm:rounded-br-xl sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        (showActions === false || isHidden) && "hidden",
      )}
    >
      <div className="flex items-center gap-2">
        {/* buttons */}

        {/* pinned (viewing other user) */}
        {isPin && isPinned && !authenticated && (
          <Pin className="h-3 w-3 shrink-0 sm:h-5 sm:w-5" />
        )}

        {/* locked (viewing other user) */}
        {!usedForGrid && !isPin && isLocked && !authenticated && (
          <Lock className="h-3 w-3 shrink-0 sm:h-5 sm:w-5" />
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
                className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
              />
            )}

            {/* mint pending */}
            {token.nonTransferableReason === "mint-pending" && (
              <DownloadCloud
                {...createHoverProps("mint-pending")}
                className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
              />
            )}

            {/* event reward */}
            {!usedForGrid &&
              token.nonTransferableReason === "challenge-reward" && (
                <PartyPopper
                  {...createHoverProps("challenge-reward")}
                  className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
                />
              )}

            {/* welcome reward */}
            {!isSendable &&
              token.nonTransferableReason === "welcome-objekt" && (
                <MailX
                  {...createHoverProps("welcome-objekt")}
                  className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
                />
              )}

            {/* used for grid */}
            {usedForGrid && (
              <Grid2X2
                {...createHoverProps("used-for-grid")}
                className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
              />
            )}

            {/* used in lenticular, for some reason the nonTransferableReason isn't used here */}
            {token.lenticularPairTokenId !== 0 && (
              <Smartphone
                {...createHoverProps("lenticular-objekt")}
                className="h-3 w-3 shrink-0 sm:h-5 sm:w-5"
              />
            )}
          </div>
        )}
      </div>

      {/* status text */}
      <div className="max-w-0 overflow-hidden text-xs whitespace-nowrap transition-all group-hover:max-w-48">
        {isPin ? (
          <OverlayStatus>{m.objekt_overlay_pinned()}</OverlayStatus>
        ) : (
          <div className="contents">
            {hoverState === "send" && authenticated && (
              <OverlayStatus>{m.objekt_overlay_send()}</OverlayStatus>
            )}
            {hoverState === "list" && authenticated && (
              <OverlayStatus>{m.objekt_overlay_add_to_list()}</OverlayStatus>
            )}
            {hoverState === "lock" && (
              <OverlayStatus>
                {isLocked ? m.objekt_overlay_unlock() : m.objekt_overlay_lock()}
              </OverlayStatus>
            )}
            {hoverState === "pin" && (
              <OverlayStatus>
                {isPinned ? m.objekt_overlay_unpin() : m.objekt_overlay_pin()}
              </OverlayStatus>
            )}
            {token.nonTransferableReason === "not-transferable" && (
              <OverlayStatus>
                {m.objekt_overlay_not_transferable()}
              </OverlayStatus>
            )}
            {token.nonTransferableReason === "mint-pending" && (
              <OverlayStatus>{m.objekt_overlay_mint_pending()}</OverlayStatus>
            )}
            {!usedForGrid &&
              token.nonTransferableReason === "challenge-reward" && (
                <OverlayStatus>{m.objekt_overlay_event_reward()}</OverlayStatus>
              )}
            {!isSendable &&
              token.nonTransferableReason === "welcome-objekt" && (
                <OverlayStatus>
                  {m.objekt_overlay_welcome_reward()}
                </OverlayStatus>
              )}
            {usedForGrid && (
              <OverlayStatus>{m.objekt_overlay_used_for_grid()}</OverlayStatus>
            )}
            {token.lenticularPairTokenId !== 0 && (
              <OverlayStatus>
                {m.objekt_overlay_lenticular_pair()}
              </OverlayStatus>
            )}
            {hoverState === undefined && !token.nonTransferableReason && (
              <OverlayStatus>
                {isLocked ? m.common_locked() : m.objekt_overlay_unlocked()}
              </OverlayStatus>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
