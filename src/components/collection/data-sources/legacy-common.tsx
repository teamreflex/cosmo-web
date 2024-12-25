import ActionOverlay from "@/components/objekt/action-overlay";
import InformationOverlay from "@/components/objekt/information-overlay";
import ObjektSidebar from "@/components/objekt/objekt-sidebar";
import { useLockedObjekt } from "@/hooks/use-profile";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";

type LegacyOverlayProps = {
  objekt: CosmoObjekt;
  authenticated: boolean;
  isPinned: boolean;
  isPin: boolean;
};

export function LegacyOverlay({
  objekt,
  authenticated,
  isPinned,
  isPin,
}: LegacyOverlayProps) {
  const isLocked = useLockedObjekt(parseInt(objekt.tokenId));

  return (
    <div className="contents">
      <ObjektSidebar
        collection={objekt.collectionNo}
        serial={objekt.objektNo}
      />
      <InformationOverlay objekt={objekt} />
      <ActionOverlay
        objekt={objekt}
        authenticated={authenticated}
        isLocked={isLocked}
        isPinned={isPinned}
        isPin={isPin}
      />
    </div>
  );
}
