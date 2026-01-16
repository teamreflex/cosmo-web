import { Objekt } from "@/lib/universal/objekt-conversion";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import { useMemo } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";

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
