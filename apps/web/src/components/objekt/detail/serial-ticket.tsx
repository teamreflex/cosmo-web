import AddToList from "@/components/lists/add-to-list";
import LockObjekt from "@/components/objekt/overlay/lock-button";
import PinObjekt from "@/components/objekt/overlay/pin-button";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { useLockedObjekt, usePinnedObjekt } from "@/hooks/use-profile";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { reasonLabel } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { IconArrowRight } from "@tabler/icons-react";
import { format } from "date-fns";
import { useMemo } from "react";
import { ObjektRibbon } from "../common";
import StatusPill from "./status-pill";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  authenticated: boolean;
};

export default function SerialTicket({
  collection,
  token,
  authenticated,
}: Props) {
  const isLocked = useLockedObjekt(token.tokenId);
  const isPinned = usePinnedObjekt(token.tokenId);
  const objektLists = useProfileContext((ctx) => ctx.objektLists);
  const { setSerial } = useObjektSerial();
  const { open } = useMetadataDialog();

  const receivedAt = useMemo(() => {
    try {
      return format(new Date(token.acquiredAt), "dd MMM yy");
    } catch {
      return token.acquiredAt;
    }
  }, [token.acquiredAt]);

  const paddedSerial = token.serial.toString().padStart(5, "0");

  function handleClick() {
    setSerial(token.serial);
    open();
  }

  const isTradable =
    token.transferable && token.nonTransferableReason === undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:gap-4 sm:px-5"
    >
      {/* ribbon sliver */}
      <ObjektRibbon collection={collection} />

      {/* serial */}
      <div className="w-20 shrink-0 sm:w-24">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.detail_sort_serial()}
        </div>
        <div className="font-mono text-sm font-bold tabular-nums sm:text-lg">
          #{paddedSerial}
        </div>
      </div>

      {/* received date — desktop only */}
      <div className="hidden w-28 shrink-0 md:block">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.detail_sort_received()}
        </div>
        <div className="text-xs">{receivedAt}</div>
      </div>

      {/* status pills */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {isTradable && (
          <StatusPill tone="accent">{m.common_tradable()}</StatusPill>
        )}
        {isPinned && (
          <StatusPill tone="accent">{m.objekt_overlay_pinned()}</StatusPill>
        )}
        {isLocked && <StatusPill tone="muted">{m.common_locked()}</StatusPill>}
        {!isTradable && token.nonTransferableReason && (
          <StatusPill tone="muted">
            {reasonLabel(token.nonTransferableReason)}
          </StatusPill>
        )}
      </div>

      {/* actions — authenticated owner only, always visible */}
      {authenticated && (
        <div
          className="flex items-center gap-3 text-foreground [&_svg]:size-5 sm:gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <PinObjekt
            collectionId={collection.collectionId}
            tokenId={token.tokenId}
            isPinned={isPinned}
          />
          <AddToList
            collectionName={collection.collectionId}
            slug={collection.slug}
            collectionId={collection.id}
            lists={objektLists}
            tokenId={token.tokenId}
          />
          <LockObjekt tokenId={token.tokenId} isLocked={isLocked} />
        </div>
      )}

      <IconArrowRight className="ml-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
    </div>
  );
}
