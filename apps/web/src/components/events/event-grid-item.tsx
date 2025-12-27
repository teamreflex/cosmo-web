import { useMemo } from "react";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { ObjektSidebar } from "../objekt/common";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  item: IndexedObjekt;
  id: string;
  priority: boolean;
};

export default function EventGridItem(props: Props) {
  const collection = useMemo(
    () => Objekt.fromIndexer(props.item),
    [props.item],
  );

  return (
    <ExpandableObjekt collection={collection} priority={props.priority}>
      <ObjektSidebar collection={collection} />
    </ExpandableObjekt>
  );
}
