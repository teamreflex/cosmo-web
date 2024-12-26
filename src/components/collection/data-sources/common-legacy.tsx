import ActionOverlay from "@/components/objekt/overlay/action-overlay";
import InformationOverlay from "@/components/objekt/overlay/information-overlay";
import { useLockedObjekt } from "@/hooks/use-profile";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { ObjektSidebar } from "@/components/objekt/common";

type LegacyOverlayProps = {
  objekt: CosmoObjekt;
  slug: string;
  authenticated: boolean;
  isPinned: boolean;
  isPin: boolean;
};

export function LegacyOverlay({
  objekt,
  slug,
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
        slug={slug}
        authenticated={authenticated}
        isLocked={isLocked}
        isPinned={isPinned}
        isPin={isPin}
      />
    </div>
  );
}
