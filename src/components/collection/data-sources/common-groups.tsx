import { ObjektSidebar } from "@/components/objekt/common";
import { BFFCollectionGroup } from "@/lib/universal/cosmo/objekts";

type GroupsOverlayProps = {
  collection: BFFCollectionGroup;
};

export function GroupsOverlay({ collection }: GroupsOverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar collection={collection.collection.collectionNo} />
      {collection.count > 1 && <Count collection={collection} />}
    </div>
  );
}

function Count({ collection }: GroupsOverlayProps) {
  return (
    <span className="absolute bottom-3 left-3 px-2 py-px bg-black text-white rounded-full text-sm font-semibold">
      {collection.count}
    </span>
  );
}
