import ActionOverlay from "./overlay/action-overlay";
import { useLockedObjekt } from "@/hooks/use-profile";
import { Objekt } from "@/lib/universal/objekt-conversion";
import ExpandableObjekt from "./objekt-expandable";
import { ObjektSidebar } from "./common";
import InformationOverlay from "./overlay/information-overlay";
import { useAuthenticated } from "@/hooks/use-authenticated";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  isPinned: boolean;
};

/**
 * Used within a collection group list.
 */
export default function StaticObjekt({ collection, token, isPinned }: Props) {
  const authenticated = useAuthenticated();
  const isLocked = useLockedObjekt(token.tokenId);

  return (
    <ExpandableObjekt tokenId={token.tokenId} collection={collection}>
      <ObjektSidebar
        collection={collection.collectionNo}
        serial={token.serial}
      />
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
