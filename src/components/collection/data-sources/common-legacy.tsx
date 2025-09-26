import type { Objekt } from "@/lib/universal/objekt-conversion";
import ActionOverlay from "@/components/objekt/overlay/action-overlay";
import InformationOverlay from "@/components/objekt/overlay/information-overlay";
import { useLockedObjekt, usePinnedObjekt } from "@/hooks/use-profile";
import { ObjektSidebar } from "@/components/objekt/common";

type LegacyOverlayProps = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  authenticated: boolean;
  isPin: boolean;
};

export function LegacyOverlay({
  collection,
  token,
  authenticated,
  isPin,
}: LegacyOverlayProps) {
  const isLocked = useLockedObjekt(token.tokenId);
  const isPinned = usePinnedObjekt(token.tokenId);

  return (
    <div className="contents">
      <ObjektSidebar collection={collection} serial={token.serial} />
      <InformationOverlay collection={collection} token={token} />
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
