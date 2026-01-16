import { useAuthenticated } from "@/hooks/use-authenticated";
import { useLockedObjekt } from "@/hooks/use-profile";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { ObjektSidebar } from "./common";
import ExpandableObjekt from "./objekt-expandable";
import ActionOverlay from "./overlay/action-overlay";
import InformationOverlay from "./overlay/information-overlay";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  isPinned: boolean;
};

/**
 * Used within a collection group list.
 */
export default function StaticObjekt({ collection, token, isPinned }: Props) {
  const isLocked = useLockedObjekt(token.tokenId);
  const authenticated = useAuthenticated();

  return (
    <ExpandableObjekt tokenId={token.tokenId} collection={collection}>
      <ObjektSidebar collection={collection} serial={token.serial} />
      <InformationOverlay collection={collection} token={token} />
      <ActionOverlay
        collection={collection}
        token={token}
        authenticated={authenticated}
        isLocked={isLocked}
        isPinned={isPinned}
        isPin={false}
      />
    </ExpandableObjekt>
  );
}
