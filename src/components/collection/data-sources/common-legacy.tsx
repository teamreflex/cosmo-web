import ActionOverlay from "@/components/objekt/overlay/action-overlay";
import InformationOverlay from "@/components/objekt/overlay/information-overlay";
import { useLockedObjekt } from "@/hooks/use-profile";
import { ObjektSidebar } from "@/components/objekt/common";
import { Objekt } from "@/lib/universal/objekt-conversion";

type LegacyOverlayProps = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  authenticated: boolean;
  isPinned: boolean;
  isPin: boolean;
};

export function LegacyOverlay({
  collection,
  token,
  authenticated,
  isPinned,
  isPin,
}: LegacyOverlayProps) {
  const isLocked = useLockedObjekt(token.tokenId);

  return (
    <div className="contents">
      <ObjektSidebar
        artist={collection.artist}
        member={collection.member}
        collection={collection.collectionNo}
        serial={token.serial}
      />
      <InformationOverlay token={token} />
      <ActionOverlay
        collection={collection}
        token={token}
        authenticated={authenticated}
        isLocked={isLocked}
        isPinned={isPinned}
        isPin={isPin}
      />
    </div>
  );
}
